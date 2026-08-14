import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import type { GoalDoc } from "@/types";

const METAS = "goals";

export function subscribeToGoals(professionalId: string, callback: (itens: GoalDoc[]) => void) {
  const q = query(collection(db, METAS), where("professionalId", "==", professionalId));
  return onSnapshot(q, (snap) => {
    const itens = snap.docs.map((d) => ({ id: d.id, ...d.data() } as GoalDoc));
    // Concluída vai para o fim; o resto sobe pela data mais próxima. Quem tem
    // prazo em março tem que aparecer antes de quem tem prazo em dezembro.
    callback(
      itens.sort((a, b) => {
        if (!!a.concluida !== !!b.concluida) return a.concluida ? 1 : -1;
        return (a.inicio ?? "9999").localeCompare(b.inicio ?? "9999");
      })
    );
  });
}

export async function criarMeta(professionalId: string, dados: Partial<GoalDoc>) {
  await addDoc(collection(db, METAS), {
    professionalId,
    tipo: dados.tipo ?? "meta",
    titulo: dados.titulo?.trim() ?? "",
    ...(dados.detalhe?.trim() ? { detalhe: dados.detalhe.trim() } : {}),
    ...(dados.inicio ? { inicio: dados.inicio } : {}),
    ...(dados.fim ? { fim: dados.fim } : {}),
    ...(dados.alvo ? { alvo: dados.alvo, progresso: dados.progresso ?? 0 } : {}),
    ...(dados.unidade?.trim() ? { unidade: dados.unidade.trim() } : {}),
    concluida: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function atualizarMeta(id: string, dados: Partial<GoalDoc>) {
  await updateDoc(doc(db, METAS, id), { ...dados, updatedAt: serverTimestamp() });
}

export async function removerMeta(id: string) {
  await deleteDoc(doc(db, METAS, id));
}

/**
 * Avisos de agenda que pegam uma data.
 *
 * Usado na hora de marcar atendimento: é o que transforma "anotei que não quero
 * atender em julho" em alguma coisa que aparece em julho, quando ela já
 * esqueceu que anotou.
 */
export function avisosNaData(metas: GoalDoc[], data: string): GoalDoc[] {
  if (!data) return [];
  return metas.filter(
    (m) => m.tipo === "agenda" && !m.concluida && (m.inicio ?? "") <= data && data <= (m.fim ?? m.inicio ?? "")
  );
}

/** Quantos dias depois do período uma meta ainda conta como atropelada por ele. */
const FOLGA_DIAS = 21;

function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * Metas que este período de ausência atropela.
 *
 * Não é só a meta que vence no meio do congresso: é também a que vence logo
 * depois, porque as três semanas de trabalho que ela contava ter antes do prazo
 * são justamente as que vão embora. O aviso serve para ela remarcar o prazo
 * enquanto ainda dá tempo, e não para descobrir em dezembro por que não deu.
 */
export function metasAtropeladas(metas: GoalDoc[], aviso: { inicio?: string; fim?: string; id?: string }): GoalDoc[] {
  const inicio = aviso.inicio;
  if (!inicio) return [];
  const limite = somarDias(aviso.fim ?? inicio, FOLGA_DIAS);
  return metas.filter(
    (m) =>
      m.tipo === "meta" &&
      !m.concluida &&
      m.id !== aviso.id &&
      !!m.inicio &&
      m.inicio >= inicio &&
      m.inicio <= limite
  );
}
