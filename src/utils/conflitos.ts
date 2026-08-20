import type { PersonalEventDoc, SessionDoc } from "@/types";
import type { ExternalEventDoc } from "@/services/externalEvents";
import { minutesOf } from "./agenda";

/**
 * Choque de horário na agenda.
 *
 * A separação entre "impede" e "avisa" não é detalhe de interface: marcar o mesmo
 * paciente duas vezes no mesmo horário é sempre erro de digitação — ninguém atende
 * a mesma pessoa em duas sessões simultâneas. Já dois pacientes no mesmo horário
 * pode ser proposital (atendimento de casal lançado em dois nomes, encaixe que ela
 * sabe que vai remarcar, sala dividida com colega). Nesse caso o sistema fala, e
 * ela decide.
 */
export type Choque =
  | { tipo: "mesmo-paciente"; nome: string; quando: string; sessaoId: string }
  | { tipo: "outro-paciente"; nome: string; quando: string }
  | { tipo: "pessoal"; nome: string; quando: string }
  | { tipo: "google"; nome: string; quando: string };

export interface AgendaDoDia {
  sessoes: SessionDoc[];
  pessoais?: PersonalEventDoc[];
  externos?: ExternalEventDoc[];
}

export interface Alvo {
  date: string;
  startTime: string;
  endTime: string;
  patientId: string;
  /** Ao editar, a própria sessão não conta como choque consigo mesma. */
  ignorarSessaoId?: string;
}

function sobrepoe(aInicio: string, aFim: string, bInicio: string, bFim: string): boolean {
  return minutesOf(aInicio) < minutesOf(bFim) && minutesOf(aFim) > minutesOf(bInicio);
}

function faixa(inicio: string, fim: string): string {
  return `${inicio} às ${fim}`;
}

/** O choque que impede de gravar, se houver. */
export function bloqueio(choques: Choque[]): Choque | undefined {
  return choques.find((c) => c.tipo === "mesmo-paciente");
}

/**
 * Tudo que já ocupa o horário pretendido.
 *
 * Sessão cancelada não ocupa nada — o horário voltou a ficar livre no momento em
 * que ela foi cancelada. Compromisso pessoal sem hora (uma demanda solta do dia)
 * também não entra: ele não disputa um horário, só mora naquele dia.
 */
export function acharChoques(alvo: Alvo, agenda: AgendaDoDia): Choque[] {
  const choques: Choque[] = [];

  agenda.sessoes.forEach((s) => {
    if (s.id === alvo.ignorarSessaoId) return;
    if (s.date !== alvo.date) return;
    if (s.status === "cancelled") return;
    if (!sobrepoe(alvo.startTime, alvo.endTime, s.startTime, s.endTime)) return;

    choques.push(
      s.patientId === alvo.patientId
        ? { tipo: "mesmo-paciente", nome: s.patientName, quando: faixa(s.startTime, s.endTime), sessaoId: s.id }
        : { tipo: "outro-paciente", nome: s.patientName, quando: faixa(s.startTime, s.endTime) }
    );
  });

  (agenda.pessoais ?? []).forEach((e) => {
    if (e.date !== alvo.date || !e.startTime || !e.endTime) return;
    if (!sobrepoe(alvo.startTime, alvo.endTime, e.startTime, e.endTime)) return;
    choques.push({ tipo: "pessoal", nome: e.title, quando: faixa(e.startTime, e.endTime) });
  });

  (agenda.externos ?? []).forEach((e) => {
    if (e.date !== alvo.date || e.diaInteiro) return;
    if (!sobrepoe(alvo.startTime, alvo.endTime, e.startTime, e.endTime)) return;
    choques.push({ tipo: "google", nome: e.titulo, quando: faixa(e.startTime, e.endTime) });
  });

  // O bloqueio primeiro: é o que a tela precisa mostrar em cima.
  return choques.sort((a, b) => Number(b.tipo === "mesmo-paciente") - Number(a.tipo === "mesmo-paciente"));
}

/** Frase pronta para o aviso, no plural certo e sem repetir o mesmo nome. */
export function resumirChoques(choques: Choque[]): string {
  const nomes = [...new Set(choques.map((c) => c.nome))];
  if (nomes.length === 1) return nomes[0];
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

/**
 * O bloco do Google é eco de um atendimento que já existe aqui?
 *
 * Depois de converter um compromisso do Google em sessão, os dois passam a
 * ocupar o mesmo espaço na grade e a semana parece dobrada — e o Google continua
 * mandando o mesmo compromisso a cada leitura. Comparar só o horário de início
 * não bastava: bastava ela arrastar a sessão dez minutos para o bloco reaparecer.
 *
 * O critério é cobertura: se um atendimento cobre a maior parte do bloco, é o
 * mesmo compromisso visto duas vezes. Sobreposição pequena continua aparecendo —
 * aí são dois compromissos brigando, e ela precisa ver os dois.
 */
export function ecoDoGoogle(
  evento: { date: string; startTime: string; endTime: string },
  sessoes: SessionDoc[]
): boolean {
  const inicio = minutesOf(evento.startTime);
  const fim = minutesOf(evento.endTime);
  const duracao = fim - inicio;
  if (duracao <= 0) return false;

  return sessoes.some((s) => {
    if (s.date !== evento.date || s.status === "cancelled") return false;
    const coberto = Math.min(fim, minutesOf(s.endTime)) - Math.max(inicio, minutesOf(s.startTime));
    return coberto / duracao >= 0.6;
  });
}

/** As datas que uma repetição semanal ou quinzenal vai ocupar. */
export function datasDaSerie(date: string, vezes: number, quinzenal = false): string[] {
  const passo = quinzenal ? 14 : 7;
  return Array.from({ length: vezes }, (_, i) => somarDias(date, i * passo));
}

export function somarDias(isoDate: string, dias: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}
