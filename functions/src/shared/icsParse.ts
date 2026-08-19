/**
 * Leitura de calendário no formato .ics, do lado do servidor.
 *
 * Usada para espelhar o Google Agenda dentro do ROTA: a profissional cola o
 * endereço secreto do calendário dela, e de tempos em tempos esta leitura roda
 * e guarda os compromissos como blocos de ocupado.
 *
 * NOTA: é gêmea de src/utils/icsImport.ts, no aplicativo, que faz o mesmo para
 * a importação única feita no navegador. São dois projetos TypeScript separados,
 * sem pacote comum; ao corrigir um, corrija o outro.
 */

export interface EventoLido {
  uid: string;
  titulo: string;
  /** YYYY-MM-DD */
  data: string;
  /** HH:mm — vazio em evento de dia inteiro. */
  inicio: string;
  fim: string;
  diaInteiro: boolean;
}

function juntarLinhas(texto: string): string[] {
  const cruas = texto.replace(/\r\n/g, "\n").split("\n");
  const linhas: string[] = [];
  cruas.forEach((l) => {
    if ((l.startsWith(" ") || l.startsWith("\t")) && linhas.length > 0) {
      linhas[linhas.length - 1] += l.slice(1);
    } else {
      linhas.push(l);
    }
  });
  return linhas;
}

const desescapar = (v: string) =>
  v.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\;/g, ";").replace(/\\\\/g, "\\");

const dd = (n: number) => String(n).padStart(2, "0");

/**
 * O fuso é fixo em São Paulo de propósito.
 *
 * Isto roda num servidor que pensa em UTC, e a agenda que estamos espelhando é
 * de um consultório em São José dos Campos. Sem fixar, todo evento entraria três
 * horas adiantado.
 */
const OFFSET_MIN = -180;

function paraLocal(d: Date): Date {
  return new Date(d.getTime() + OFFSET_MIN * 60000);
}

const chave = (d: Date) => `${d.getUTCFullYear()}-${dd(d.getUTCMonth() + 1)}-${dd(d.getUTCDate())}`;
const hora = (d: Date) => `${dd(d.getUTCHours())}:${dd(d.getUTCMinutes())}`;

/** Devolve o instante já deslocado para o horário de parede local. */
function lerData(valor: string): { data: Date; diaInteiro: boolean } | null {
  const soData = /^(\d{4})(\d{2})(\d{2})$/.exec(valor);
  if (soData) {
    return { data: new Date(Date.UTC(+soData[1], +soData[2] - 1, +soData[3])), diaInteiro: true };
  }
  const completo = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(valor);
  if (!completo) return null;
  const [, a, m, d, h, min, s, zulu] = completo;
  const bruto = new Date(Date.UTC(+a, +m - 1, +d, +h, +min, +s));
  // Sem Z o horário já é o de parede; com Z precisa sair de UTC para o local.
  return { data: zulu ? paraLocal(bruto) : bruto, diaInteiro: false };
}

interface Bruto {
  uid: string;
  titulo: string;
  inicio: Date;
  fim?: Date;
  diaInteiro: boolean;
  rrule?: string;
  exdatas: string[];
  cancelado: boolean;
}

function expandir(b: Bruto, de: Date, ate: Date): Date[] {
  if (!b.rrule) return [b.inicio];

  const partes: Record<string, string> = {};
  b.rrule.split(";").forEach((p) => {
    const [k, v] = p.split("=");
    partes[k.toUpperCase()] = v;
  });

  const freq = partes.FREQ;
  const intervalo = Number(partes.INTERVAL ?? 1) || 1;
  const contagem = partes.COUNT ? Number(partes.COUNT) : undefined;
  const limite = partes.UNTIL ? lerData(partes.UNTIL)?.data : undefined;
  const dias = partes.BYDAY ? partes.BYDAY.split(",") : [];

  if (!["DAILY", "WEEKLY", "MONTHLY"].includes(freq) || partes.BYSETPOS) return [];

  const NOME_DIA = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  const datas: Date[] = [];
  let atual = new Date(b.inicio);
  let geradas = 0;

  for (let voltas = 0; atual <= ate && voltas < 600 && (!contagem || geradas < contagem); voltas++) {
    if (limite && atual > limite) break;

    // BYDAY com vários dias vira uma semana de candidatos por volta: é o caso
    // de "toda segunda, quarta e sexta", comum em quem atende grupo.
    const candidatos =
      freq === "WEEKLY" && dias.length > 1
        ? dias
            .map((sigla) => {
              const alvo = NOME_DIA.indexOf(sigla.replace(/^[+-]?\d/, ""));
              if (alvo < 0) return null;
              const d = new Date(atual);
              d.setUTCDate(d.getUTCDate() + ((alvo - d.getUTCDay() + 7) % 7));
              return d;
            })
            .filter((d): d is Date => !!d)
        : [new Date(atual)];

    // COUNT conta ocorrências, e não voltas do laço: "toda segunda, quarta e
    // sexta, quatro vezes" são quatro compromissos, não quatro semanas deles.
    candidatos.sort((x, y) => x.getTime() - y.getTime());
    for (const c of candidatos) {
      if (contagem && geradas >= contagem) break;
      if (c < b.inicio) continue;
      geradas++;
      if (c >= de && c <= ate && !b.exdatas.includes(chave(c)) && (!limite || c <= limite)) {
        datas.push(new Date(c));
      }
    }

    if (freq === "DAILY") atual.setUTCDate(atual.getUTCDate() + intervalo);
    else if (freq === "WEEKLY") atual.setUTCDate(atual.getUTCDate() + 7 * intervalo);
    else atual.setUTCMonth(atual.getUTCMonth() + intervalo);
  }

  return datas;
}

export function lerCalendario(conteudo: string, de: Date, ate: Date): EventoLido[] {
  if (!conteudo.includes("BEGIN:VCALENDAR")) return [];

  const brutos: Bruto[] = [];
  let atual: Partial<Bruto> | null = null;

  juntarLinhas(conteudo).forEach((linha) => {
    if (linha.startsWith("BEGIN:VEVENT")) {
      atual = { exdatas: [], cancelado: false };
      return;
    }
    if (linha.startsWith("END:VEVENT")) {
      if (atual?.uid && atual.inicio && atual.titulo) brutos.push(atual as Bruto);
      atual = null;
      return;
    }
    if (!atual) return;

    const i = linha.indexOf(":");
    if (i < 0) return;
    const nome = linha.slice(0, i).split(";")[0].toUpperCase();
    const valor = linha.slice(i + 1);

    if (nome === "UID") atual.uid = valor;
    else if (nome === "SUMMARY") atual.titulo = desescapar(valor).trim();
    else if (nome === "RRULE") atual.rrule = valor;
    else if (nome === "STATUS") atual.cancelado = valor.toUpperCase() === "CANCELLED";
    else if (nome === "DTSTART") {
      const lido = lerData(valor);
      if (lido) {
        atual.inicio = lido.data;
        atual.diaInteiro = lido.diaInteiro;
      }
    } else if (nome === "DTEND") {
      const lido = lerData(valor);
      if (lido) atual.fim = lido.data;
    } else if (nome === "EXDATE") {
      valor.split(",").forEach((v) => {
        const lido = lerData(v.trim());
        if (lido) atual!.exdatas!.push(chave(lido.data));
      });
    }
  });

  const eventos: EventoLido[] = [];
  brutos
    .filter((b) => !b.cancelado)
    .forEach((b) => {
      const duracao = b.fim ? Math.max(0, (b.fim.getTime() - b.inicio.getTime()) / 60000) : 60;
      expandir(b, de, ate).forEach((d) => {
        const fim = new Date(d.getTime() + duracao * 60000);
        eventos.push({
          uid: b.uid,
          titulo: b.titulo,
          data: chave(d),
          inicio: b.diaInteiro ? "" : hora(d),
          fim: b.diaInteiro ? "" : hora(fim),
          diaInteiro: b.diaInteiro,
        });
      });
    });

  return eventos;
}
