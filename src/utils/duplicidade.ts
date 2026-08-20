import type { SessionDoc } from "@/types";
import { minutesOf } from "./agenda";

/**
 * Encontrar o que já entrou duas vezes.
 *
 * A trava que impede criar duplicata só vale daqui para a frente; o que a
 * importação do Google criou em dobro antes dela continua na agenda. Esta
 * varredura é a faxina — e ela existe separada da trava porque limpar o passado
 * e impedir o futuro são problemas diferentes: um pede decisão caso a caso, o
 * outro pede um "não".
 */

export interface GrupoDeSessoes {
  chave: string;
  patientId: string;
  patientName: string;
  date: string;
  /** Da mais antiga para a mais nova, na ordem em que foram criadas. */
  sessoes: SessionDoc[];
  /** Qual delas o sistema sugere manter. */
  sugerida: string;
}

function sobrepoe(a: SessionDoc, b: SessionDoc): boolean {
  return minutesOf(a.startTime) < minutesOf(b.endTime) && minutesOf(a.endTime) > minutesOf(b.startTime);
}

/**
 * Peso de uma sessão na hora de escolher qual fica.
 *
 * A que já foi trabalhada vale mais que a cópia intocada: sessão marcada como
 * realizada, paga ou com valor e observação preenchidos carrega informação que
 * some junto se ela for a apagada.
 */
function peso(s: SessionDoc): number {
  let p = 0;
  if (s.status === "done" || s.status === "no_show") p += 8;
  if (s.paymentStatus === "paid") p += 4;
  if (s.price != null) p += 2;
  if (s.note?.trim()) p += 1;
  return p;
}

function maisAntiga(a: SessionDoc, b: SessionDoc): number {
  const va = a.createdAt?.toMillis?.() ?? 0;
  const vb = b.createdAt?.toMillis?.() ?? 0;
  return va - vb;
}

/** A sessão do grupo que o sistema sugere manter: a mais completa; no empate, a original. */
export function melhorParaManter(grupo: SessionDoc[]): string {
  return [...grupo].sort((a, b) => peso(b) - peso(a) || maisAntiga(a, b))[0].id;
}

/**
 * Grupos de atendimentos repetidos: mesmo paciente, mesmo dia, horários que se
 * encostam. Sessão cancelada fica de fora — ela não ocupa horário nenhum.
 */
export function acharSessoesRepetidas(sessoes: SessionDoc[]): GrupoDeSessoes[] {
  const porPacienteEDia = new Map<string, SessionDoc[]>();
  sessoes.forEach((s) => {
    if (s.status === "cancelled") return;
    const chave = `${s.patientId}|${s.date}`;
    porPacienteEDia.set(chave, [...(porPacienteEDia.get(chave) ?? []), s]);
  });

  const grupos: GrupoDeSessoes[] = [];

  porPacienteEDia.forEach((doDia, chave) => {
    if (doDia.length < 2) return;
    const ordenadas = [...doDia].sort((a, b) => minutesOf(a.startTime) - minutesOf(b.startTime));

    // Varredura simples: enquanto a próxima encostar em alguma do bloco atual,
    // ela entra no mesmo bloco. Três cópias do mesmo horário viram um grupo só.
    let bloco: SessionDoc[] = [];
    const fechar = () => {
      if (bloco.length > 1) {
        const emOrdemDeCriacao = [...bloco].sort(maisAntiga);
        grupos.push({
          chave: `${chave}|${bloco[0].startTime}`,
          patientId: bloco[0].patientId,
          patientName: bloco[0].patientName,
          date: bloco[0].date,
          sessoes: emOrdemDeCriacao,
          sugerida: melhorParaManter(bloco),
        });
      }
      bloco = [];
    };

    ordenadas.forEach((s) => {
      if (bloco.length && !bloco.some((b) => sobrepoe(b, s))) fechar();
      bloco.push(s);
    });
    fechar();
  });

  return grupos.sort((a, b) => a.date.localeCompare(b.date) || a.patientName.localeCompare(b.patientName));
}

/** "José  da Silva " e "JOSE DA SILVA" são a mesma pessoa para quem procura repetido. */
export function normalizarNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export interface GrupoDeNomes {
  nome: string;
  pacientes: Array<{ id: string; name: string; sessoes: number; ativo: boolean }>;
}

/** Cadastros com o mesmo nome — o que sobra de uma importação feita duas vezes. */
export function acharCadastrosRepetidos(
  pacientes: Array<{ id: string; name: string; active?: boolean }>,
  sessoes: SessionDoc[]
): GrupoDeNomes[] {
  const contagem = new Map<string, number>();
  sessoes.forEach((s) => contagem.set(s.patientId, (contagem.get(s.patientId) ?? 0) + 1));

  const porNome = new Map<string, typeof pacientes>();
  pacientes.forEach((p) => {
    const chave = normalizarNome(p.name);
    if (!chave) return;
    porNome.set(chave, [...(porNome.get(chave) ?? []), p]);
  });

  const grupos: GrupoDeNomes[] = [];
  porNome.forEach((iguais) => {
    if (iguais.length < 2) return;
    grupos.push({
      nome: iguais[0].name,
      pacientes: iguais.map((p) => ({
        id: p.id,
        name: p.name,
        sessoes: contagem.get(p.id) ?? 0,
        ativo: p.active !== false,
      })),
    });
  });

  return grupos.sort((a, b) => a.nome.localeCompare(b.nome));
}
