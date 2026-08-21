import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PaymentStatus, SessionDoc, SessionStatus } from "@/types";

/**
 * Altura de uma hora na grade, em pixels. Define toda a escala vertical da agenda.
 *
 * Subiu de 56 para 68 quando os blocos passaram a mostrar presença, pagamento e
 * modalidade: com 56, um atendimento de 50 minutos tinha 47px e as três marcas
 * não cabiam junto do nome e do horário.
 */
export const HOUR_PX = 68;

export const DEFAULT_DAY_START = 7;
export const DEFAULT_DAY_END = 21;

export function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function weekDays(reference: Date): Date[] {
  const start = startOfWeek(reference, { weekStartsOn: 1 }); // segunda
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function dayLabel(date: Date): { weekday: string; day: string } {
  return {
    weekday: format(date, "EEE", { locale: ptBR }).replace(".", ""),
    day: format(date, "dd/MM"),
  };
}

export function weekLabel(days: Date[]): string {
  const [first] = days;
  const last = days[days.length - 1];
  const sameMonth = first.getMonth() === last.getMonth();
  return sameMonth
    ? `${format(first, "d")} a ${format(last, "d 'de' MMMM", { locale: ptBR })}`
    : `${format(first, "d 'de' MMM", { locale: ptBR })} a ${format(last, "d 'de' MMM", { locale: ptBR })}`;
}

/**
 * Faixa de horas que a grade precisa desenhar. Parte de 7h–21h e só cresce se
 * houver atendimento fora disso — assim a agenda de quem atende das 8h às 18h não
 * fica com metade da tela vazia.
 */
export function hourRange(sessions: Array<{ startTime: string; endTime: string }>): number[] {
  let start = DEFAULT_DAY_START;
  let end = DEFAULT_DAY_END;
  sessions.forEach((s) => {
    start = Math.min(start, Math.floor(minutesOf(s.startTime) / 60));
    end = Math.max(end, Math.ceil(minutesOf(s.endTime) / 60));
  });
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/** Posição e altura do bloco dentro da coluna do dia. */
export function blockGeometry(session: { startTime: string; endTime: string }, firstHour: number) {
  const top = ((minutesOf(session.startTime) - firstHour * 60) / 60) * HOUR_PX;
  const rawHeight = ((minutesOf(session.endTime) - minutesOf(session.startTime)) / 60) * HOUR_PX;
  return { top, height: Math.max(rawHeight, 26) };
}

/**
 * Sessões que se sobrepõem no mesmo dia dividem a largura da coluna, senão uma
 * cobriria a outra. Devolve, para cada sessão, em qual faixa ela entra e quantas
 * faixas existem naquele grupo.
 */
export function layoutDay<T extends { startTime: string; endTime: string }>(
  items: T[]
): Array<{ item: T; lane: number; lanes: number }> {
  const ordered = [...items].sort((a, b) => minutesOf(a.startTime) - minutesOf(b.startTime));
  const result: Array<{ item: T; lane: number; lanes: number }> = [];
  let group: typeof result = [];
  let groupEnd = -1;

  const closeGroup = () => {
    const lanes = group.reduce((max, g) => Math.max(max, g.lane + 1), 1);
    group.forEach((g) => result.push({ ...g, lanes }));
    group = [];
  };

  ordered.forEach((item) => {
    const start = minutesOf(item.startTime);
    if (start >= groupEnd && group.length) closeGroup();

    const taken = new Set(group.filter((g) => minutesOf(g.item.endTime) > start).map((g) => g.lane));
    let lane = 0;
    while (taken.has(lane)) lane++;

    group.push({ item, lane, lanes: 1 });
    groupEnd = Math.max(groupEnd, minutesOf(item.endTime));
  });
  closeGroup();

  return result;
}

/**
 * Cor do bloco. A profissional pode fixar uma cor na sessão; sem isso, cada paciente
 * ganha uma cor estável derivada do próprio id, para a semana ficar legível de relance.
 */
const BLOCK_COLORS = [
  "#2f9a7c", "#4f46e5", "#c2410c", "#0369a1", "#7c3aed",
  "#b91c1c", "#0f766e", "#a16207", "#be185d", "#3f6212",
];

export function colorForId(id: string): string {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return BLOCK_COLORS[hash % BLOCK_COLORS.length];
}

export function sessionColor(session: SessionDoc): string {
  return session.color ?? colorForId(session.patientId);
}

/** Dias da semana na ordem em que a planilha da sala mostra: segunda a domingo. */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const WEEKDAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const STATUS_LABELS: Record<SessionStatus, string> = {
  scheduled: "Agendada",
  done: "Realizada",
  no_show: "Faltou",
  cancelled: "Cancelada",
};

export const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  pending: "Pagar",
  paid: "Pago",
  exempt: "Isento",
  overdue: "Atrasado",
};

export const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  pending: "bg-brand-50 text-brand-600",
  paid: "bg-emerald-100 text-emerald-700",
  exempt: "bg-slate-100 text-slate-600",
  overdue: "bg-rose-100 text-rose-700",
};

/**
 * As três marcas que o bloco mostra sem ninguém abrir nada: veio, pagou, onde foi.
 *
 * São as três perguntas que ela responde o dia inteiro, e ler a semana de relance
 * vale mais do que abrir vinte atendimentos para conferir um a um. A presença
 * some quando a sessão ainda está só agendada — nada aconteceu para marcar.
 */
export interface MarcaDaSessao {
  chave: "presenca" | "pagamento" | "modalidade";
  icone: string;
  titulo: string;
}

export function marcasDaSessao(session: SessionDoc): MarcaDaSessao[] {
  const marcas: MarcaDaSessao[] = [];

  if (session.status === "done") marcas.push({ chave: "presenca", icone: "👍", titulo: "Compareceu" });
  else if (session.status === "no_show") marcas.push({ chave: "presenca", icone: "👎", titulo: "Faltou" });
  else if (session.status === "cancelled") marcas.push({ chave: "presenca", icone: "🚫", titulo: "Cancelada" });

  if (session.paymentStatus === "paid") marcas.push({ chave: "pagamento", icone: "💲", titulo: "Pago" });
  else if (session.paymentStatus === "exempt") marcas.push({ chave: "pagamento", icone: "🎁", titulo: "Isento" });
  // Pendente ganha um desenho próprio em vez do mesmo cifrão apagado: na grade,
  // distinguir dois ícones iguais pela opacidade não funciona — some no fundo
  // colorido do bloco, que é justamente onde eles aparecem.
  else
    marcas.push(
      session.paymentStatus === "overdue"
        ? { chave: "pagamento", icone: "❗", titulo: "Pagamento atrasado" }
        : { chave: "pagamento", icone: "⏳", titulo: "A pagar" }
    );

  marcas.push(
    session.modality === "online"
      ? { chave: "modalidade", icone: "💻", titulo: "Online" }
      : { chave: "modalidade", icone: "🏠", titulo: "Presencial" }
  );

  return marcas;
}

export function formatMoney(value: number | undefined): string {
  return (value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function monthKeyOf(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export function monthLabel(monthKey: string): string {
  return format(parseISO(`${monthKey}-01`), "MMM/yy", { locale: ptBR });
}
