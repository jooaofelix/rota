import type { PersonalKind } from "@/types";

export const PERSONAL_LABELS: Record<PersonalKind, string> = {
  personal: "Pessoal",
  admin: "Administrativo",
  study: "Estudo",
  break: "Pausa",
  errand: "Resolver",
  other: "Outro",
};

export const PERSONAL_ICONS: Record<PersonalKind, string> = {
  personal: "🏡",
  admin: "🗂️",
  study: "📖",
  break: "☕",
  errand: "🏃",
  other: "📌",
};

/**
 * Cor do bloco na grade. Tons frios e dessaturados de propósito: o compromisso
 * pessoal precisa ocupar o horário sem competir com o atendimento, que é o que
 * ela procura quando bate o olho na semana.
 */
export const PERSONAL_COLORS: Record<PersonalKind, string> = {
  personal: "#64748b",
  admin: "#475569",
  study: "#0f766e",
  break: "#78716c",
  errand: "#57534e",
  other: "#525252",
};

/** Sugestões de um toque, para o caso comum não virar digitação. */
export const PERSONAL_SUGGESTIONS: Array<{ title: string; kind: PersonalKind; minutes?: number }> = [
  { title: "Almoço", kind: "break", minutes: 60 },
  { title: "Supervisão", kind: "study", minutes: 60 },
  { title: "Estudo de caso", kind: "study", minutes: 60 },
  { title: "Pausa entre atendimentos", kind: "break", minutes: 30 },
  { title: "Anotar prontuários", kind: "admin", minutes: 45 },
  { title: "Responder mensagens", kind: "admin", minutes: 30 },
  { title: "Consulta médica", kind: "personal", minutes: 60 },
  { title: "Academia", kind: "personal", minutes: 60 },
  { title: "Banco / contador", kind: "errand", minutes: 60 },
  { title: "Buscar na escola", kind: "personal", minutes: 30 },
];

/** "13:00" + 50 -> "13:50". Sem dependência de fuso: é só conta de minutos. */
export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor((total % 1440) / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
