import type { RoomPartnerDoc, RoomSlotDoc } from "@/types";
import { minutesOf } from "./agenda";

export type RoomCheck =
  /** O horário cai dentro de um turno da própria profissional. */
  | { status: "own" }
  /** A sala é de outra pessoa nesse horário. */
  | { status: "taken"; occupantName: string; occupant?: RoomPartnerDoc; slot: RoomSlotDoc }
  /** Ninguém tem a sala reservada nesse horário. */
  | { status: "free" }
  /** A escala da sala ainda não foi montada — não há o que conferir. */
  | { status: "unknown" };

function overlaps(slot: RoomSlotDoc, startTime: string, endTime: string): boolean {
  return minutesOf(slot.startTime) < minutesOf(endTime) && minutesOf(slot.endTime) > minutesOf(startTime);
}

/**
 * Confere se um atendimento cabe no turno da profissional na sala.
 *
 * A escala é semanal, então o que importa da data é só o dia da semana. Quando o
 * horário pertence a outra pessoa, devolve quem é — o aviso precisa dizer o nome,
 * senão não ajuda a decidir.
 */
export function checkRoom(
  date: string,
  startTime: string,
  endTime: string,
  slots: RoomSlotDoc[],
  partners: RoomPartnerDoc[]
): RoomCheck {
  if (slots.length === 0) return { status: "unknown" };

  const weekday = new Date(`${date}T12:00:00`).getDay();
  const doDia = slots.filter((s) => s.weekday === weekday && overlaps(s, startTime, endTime));
  if (doDia.length === 0) return { status: "free" };

  const owners = new Set(partners.filter((p) => p.isOwner).map((p) => p.id));
  if (doDia.some((s) => owners.has(s.partnerId))) return { status: "own" };

  const slot = doDia[0];
  return {
    status: "taken",
    occupantName: slot.partnerName,
    occupant: partners.find((p) => p.id === slot.partnerId),
    slot,
  };
}

/** Os turnos da própria profissional num dia da semana, para sombrear a grade. */
export function ownWindows(weekday: number, slots: RoomSlotDoc[], partners: RoomPartnerDoc[]) {
  const owners = new Set(partners.filter((p) => p.isOwner).map((p) => p.id));
  return slots.filter((s) => s.weekday === weekday && owners.has(s.partnerId));
}

export function hasOwnSchedule(slots: RoomSlotDoc[], partners: RoomPartnerDoc[]): boolean {
  const owners = new Set(partners.filter((p) => p.isOwner).map((p) => p.id));
  return slots.some((s) => owners.has(s.partnerId));
}

/** Mensagem de aviso ao profissional cuja sala será ocupada. */
export function conflictEmailBody(
  occupantName: string,
  ownerName: string,
  date: string,
  startTime: string,
  endTime: string
): string {
  const dia = date.split("-").reverse().join("/");
  return [
    `Olá, ${occupantName.split(" ")[0]}!`,
    "",
    `Preciso usar a sala no dia ${dia}, das ${startTime} às ${endTime} — horário que na escala é seu.`,
    "",
    "Consegue me confirmar se tudo bem? Se atrapalhar, a gente combina outro horário.",
    "",
    ownerName,
  ].join("\n");
}
