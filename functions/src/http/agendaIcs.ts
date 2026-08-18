import { onRequest } from "firebase-functions/v2/https";
import { db } from "../admin";

/**
 * Feed de calendário para assinatura (Google Agenda, Apple, Outlook).
 *
 * É a única forma de sincronizar sem pedir login do Google: o calendário dela
 * assina um endereço e busca sozinho de tempos em tempos. Mão única — o que
 * está no ROTA aparece lá, e o que ela criar direto no Google não volta.
 *
 * O endereço é a credencial, como nos outros links do sistema, e por isso o
 * token é sorteado e trocável. Mesmo assim o padrão é não publicar nome de
 * paciente: quem assina um calendário costuma esquecer que ele espelha para o
 * celular, para o relógio e às vezes para a tela do carro.
 *
 * NOTA: a montagem do arquivo é gêmea de src/utils/ics.ts, no aplicativo. São
 * dois projetos TypeScript separados, sem pacote comum; ao mexer em um, mexa
 * no outro.
 */

type Privacidade = "nome" | "iniciais" | "oculto";

const escapar = (t: string) =>
  t.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

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

const carimbo = (data: string, hora: string) => `${data.replace(/-/g, "")}T${hora.replace(":", "")}00`;
/** O dia inteiro no formato termina no dia seguinte: o fim é exclusivo. */
function diaSeguinte(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

const agora = () => new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

function iniciais(nome: string): string {
  return nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join(".") + ".";
}

function titulo(nome: string, p: Privacidade): string {
  if (p === "nome") return nome;
  if (p === "iniciais") return `Atendimento · ${iniciais(nome)}`;
  return "Atendimento";
}

/** Data de N dias atrás/à frente, em YYYY-MM-DD. */
function dia(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export const agendaIcs = onRequest(
  { region: "southamerica-east1", cors: false, invoker: "public" },
  async (req, res) => {
    const token = String(req.query.t ?? "").trim();
    if (!token || token.length < 20) {
      res.status(400).send("Endereço inválido.");
      return;
    }

    const achados = await db.collection("calendarFeeds").where("token", "==", token).limit(1).get();
    const feed = achados.docs[0];
    if (!feed || feed.data().ativo === false) {
      res.status(404).send("Calendário não encontrado.");
      return;
    }

    const professionalId = feed.data().professionalId as string;
    const privacidade = (feed.data().privacidade ?? "iniciais") as Privacidade;
    const fuso = "America/Sao_Paulo";

    // Janela fixa: dois meses para trás e seis para frente. Calendário assinado
    // não precisa carregar a história inteira toda vez que o Google passa aqui.
    const [sessoes, pessoais] = await Promise.all([
      db
        .collection("sessions")
        .where("professionalId", "==", professionalId)
        .where("date", ">=", dia(-60))
        .where("date", "<=", dia(180))
        .get(),
      db
        .collection("personalEvents")
        .where("professionalId", "==", professionalId)
        .where("date", ">=", dia(-60))
        .where("date", "<=", dia(180))
        .get(),
    ]);

    const linhas: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ROTA//Agenda//PT",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:ROTA — Atendimentos",
      `X-WR-TIMEZONE:${fuso}`,
      // Sugestão de intervalo de atualização. O Google respeita quando quer, mas
      // Apple e Outlook costumam obedecer.
      "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
      "X-PUBLISHED-TTL:PT1H",
    ];

    sessoes.forEach((doc) => {
      const s = doc.data();
      const descricao = [
        s.modality === "online" ? "Atendimento online" : "Atendimento presencial",
        s.meetingUrl ? `Link: ${s.meetingUrl}` : "",
        s.note ? `Obs.: ${s.note}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      linhas.push(
        "BEGIN:VEVENT",
        dobrar(`UID:sessao-${doc.id}@rota`),
        dobrar(`DTSTAMP:${agora()}`),
        dobrar(`DTSTART;TZID=${fuso}:${carimbo(s.date, s.startTime)}`),
        dobrar(`DTEND;TZID=${fuso}:${carimbo(s.date, s.endTime)}`),
        dobrar(`SUMMARY:${escapar(titulo(s.patientName ?? "Atendimento", privacidade))}`),
        dobrar(`DESCRIPTION:${escapar(descricao)}`),
        dobrar(`LOCATION:${escapar(s.modality === "online" ? s.meetingUrl ?? "Online" : "Consultório")}`),
        dobrar(`STATUS:${s.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`),
        "END:VEVENT"
      );
    });

    pessoais.forEach((doc) => {
      const p = doc.data();
      // Compromisso sem horário vira evento de dia inteiro, e não meia-noite.
      const horario =
        p.startTime && p.endTime
          ? [
              dobrar(`DTSTART;TZID=${fuso}:${carimbo(p.date, p.startTime)}`),
              dobrar(`DTEND;TZID=${fuso}:${carimbo(p.date, p.endTime)}`),
            ]
          : [
              dobrar(`DTSTART;VALUE=DATE:${p.date.replace(/-/g, "")}`),
              dobrar(`DTEND;VALUE=DATE:${diaSeguinte(p.date)}`),
            ];

      linhas.push(
        "BEGIN:VEVENT",
        dobrar(`UID:pessoal-${doc.id}@rota`),
        dobrar(`DTSTAMP:${agora()}`),
        ...horario,
        dobrar(`SUMMARY:${escapar(p.title ?? "Compromisso")}`),
        dobrar(`DESCRIPTION:${escapar(p.note ?? "")}`),
        "STATUS:CONFIRMED",
        "END:VEVENT"
      );
    });

    linhas.push("END:VCALENDAR");

    res.set("Content-Type", "text/calendar; charset=utf-8");
    res.set("Cache-Control", "public, max-age=900");
    res.status(200).send(linhas.join("\r\n"));
  }
);
