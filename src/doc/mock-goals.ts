/** Mock das metas, só para as capturas de tela. */
import { Timestamp } from "firebase/firestore";
import type { GoalDoc } from "@/types";

const base = { professionalId: "pro", createdAt: Timestamp.now(), updatedAt: Timestamp.now() };

const DEMO: GoalDoc[] = [
  { id: "g1", ...base, tipo: "agenda", titulo: "Congresso de Terapia do Esquema", detalhe: "Passagem comprada", inicio: "2026-09-14", fim: "2026-09-18", concluida: false },
  { id: "g2", ...base, tipo: "meta", titulo: "Concluir a especialização em TCC", inicio: "2026-12-15", concluida: false },
  { id: "g3", ...base, tipo: "meta", titulo: "Leituras do ano", inicio: "2026-12-31", alvo: 12, progresso: 7, unidade: "livros", concluida: false },
  { id: "g4", ...base, tipo: "agenda", titulo: "Início do projeto na clínica-escola — reduzir agenda", inicio: "2026-08-01", fim: "2026-08-31", concluida: false },
];

export function subscribeToGoals(_p: string, callback: (itens: GoalDoc[]) => void) {
  callback(DEMO);
  return () => {};
}
export async function criarMeta() {}
export async function atualizarMeta() {}
export async function removerMeta() {}
export function avisosNaData(metas: GoalDoc[], data: string): GoalDoc[] {
  if (!data) return [];
  return metas.filter((m) => m.tipo === "agenda" && (m.inicio ?? "") <= data && data <= (m.fim ?? m.inicio ?? ""));
}
