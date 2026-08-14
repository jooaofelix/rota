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
