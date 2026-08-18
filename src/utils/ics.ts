import type { PersonalEventDoc, SessionDoc } from "@/types";

/**
 * Geração do arquivo de calendário (.ics).
 *
 * O mesmo texto serve para duas coisas: o arquivo que ela baixa e importa uma
 * vez, e a assinatura que o Google busca sozinho de tempos em tempos. Por isso
 * mora aqui e não dentro de uma tela — a Cloud Function do feed usa a mesma
 * montagem, na mesma ordem, com as mesmas regras de privacidade.
 */

/** Como o nome do paciente aparece no calendário externo. */
export type PrivacidadeCalendario = "nome" | "iniciais" | "oculto";

export interface OpcoesIcs {
  privacidade: PrivacidadeCalendario;
  /** Fuso dos horários gravados. A agenda é local; o .ics precisa dizer qual. */
  fuso?: string;
}

/**
 * Quebra de linha e escape do formato.
 *
 * Vírgula, ponto e vírgula e barra invertida têm significado dentro do arquivo;
 * um nome com vírgula parte o campo em dois e o evento chega torto no celular.
 */
function escapar(texto: string): string {
  return texto
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** O formato exige linhas de no máximo 75 octetos, continuadas com um espaço. */
function dobrar(linha: string): string {
  if (linha.length <= 75) return linha;
  const partes: string[] = [linha.slice(0, 75)];
  let resto = linha.slice(75);
  while (resto.length > 74) {
    partes.push(" " + resto.slice(0, 74));
    resto = resto.slice(74);
  }
  if (resto) partes.push(" " + resto);
  return partes.join("\r\n");
}

function carimbo(data: string, hora: string): string {
  return `${data.replace(/-/g, "")}T${hora.replace(":", "")}00`;
}

/** O dia inteiro no formato termina no dia seguinte: o fim é exclusivo. */
function diaSeguinte(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function agora(): string {
  return new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join(".") + ".";
}

/**
 * O título do evento no calendário externo.
 *
 * Google Agenda sincroniza com o celular, com o relógio, às vezes com a tela do
 * carro — e nome de paciente é dado de saúde. Por isso o padrão do sistema é
 * iniciais, e o nome completo só sai se ela escolher.
 */
export function tituloDoEvento(nomePaciente: string, privacidade: PrivacidadeCalendario): string {
  if (privacidade === "nome") return nomePaciente;
  if (privacidade === "iniciais") return `Atendimento · ${iniciais(nomePaciente)}`;
  return "Atendimento";
}

function evento(campos: Record<string, string | undefined>): string[] {
  return Object.entries(campos)
    .filter(([, v]) => v)
    .map(([k, v]) => dobrar(`${k}:${v}`));
}

/**
 * Monta o calendário.
 *
 * Sessão cancelada entra com STATUS:CANCELLED em vez de sumir: quem já tinha o
 * evento no celular precisa ver que ele caiu, e um evento que simplesmente
 * some do arquivo continua lá no aparelho de quem já sincronizou.
 */
export function montarIcs(
  sessoes: SessionDoc[],
  pessoais: PersonalEventDoc[],
  opcoes: OpcoesIcs
): string {
  const fuso = opcoes.fuso ?? "America/Sao_Paulo";
  const linhas: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ROTA//Agenda//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:ROTA — Atendimentos",
    `X-WR-TIMEZONE:${fuso}`,
  ];

  sessoes.forEach((s) => {
    const descricao = [
      s.modality === "online" ? "Atendimento online" : "Atendimento presencial",
      s.meetingUrl ? `Link: ${s.meetingUrl}` : "",
      s.note ? `Obs.: ${s.note}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    linhas.push(
      "BEGIN:VEVENT",
      ...evento({
        UID: `sessao-${s.id}@rota`,
        DTSTAMP: agora(),
        [`DTSTART;TZID=${fuso}`]: carimbo(s.date, s.startTime),
        [`DTEND;TZID=${fuso}`]: carimbo(s.date, s.endTime),
        SUMMARY: escapar(tituloDoEvento(s.patientName, opcoes.privacidade)),
        DESCRIPTION: escapar(descricao),
        LOCATION: s.modality === "online" ? escapar(s.meetingUrl ?? "Online") : "Consultório",
        STATUS: s.status === "cancelled" ? "CANCELLED" : "CONFIRMED",
      }),
      "END:VEVENT"
    );
  });

  pessoais.forEach((p) => {
    // Compromisso sem horário ("resolver o INSS hoje") vira evento de dia
    // inteiro. Sem isto ele cairia à meia-noite, que não é o que ela quis dizer.
    const horario =
      p.startTime && p.endTime
        ? {
            [`DTSTART;TZID=${fuso}`]: carimbo(p.date, p.startTime),
            [`DTEND;TZID=${fuso}`]: carimbo(p.date, p.endTime),
          }
        : {
            "DTSTART;VALUE=DATE": p.date.replace(/-/g, ""),
            "DTEND;VALUE=DATE": diaSeguinte(p.date),
          };

    linhas.push(
      "BEGIN:VEVENT",
      ...evento({
        UID: `pessoal-${p.id}@rota`,
        DTSTAMP: agora(),
        ...horario,
        SUMMARY: escapar(p.title),
        DESCRIPTION: escapar(p.note ?? ""),
        STATUS: "CONFIRMED",
      }),
      "END:VEVENT"
    );
  });

  linhas.push("END:VCALENDAR");
  return linhas.join("\r\n");
}

/** Baixa o arquivo, para quem prefere importar uma vez em vez de assinar. */
export function baixarIcs(conteudo: string, nomeArquivo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}
