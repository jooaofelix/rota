import { arrayUnion, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { AnamneseDoc } from "@/types";

const COLECAO = "anamneses";

export function subscribeToAnamnese(patientId: string, callback: (a: AnamneseDoc | null) => void) {
  return onSnapshot(doc(db, COLECAO, patientId), (snap) =>
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as AnamneseDoc) : null)
  );
}

export async function getAnamnese(patientId: string): Promise<AnamneseDoc | null> {
  const snap = await getDoc(doc(db, COLECAO, patientId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as AnamneseDoc) : null;
}

/**
 * Salva o que foi preenchido até agora.
 *
 * Merge e não substituição: a anamnese é preenchida ao longo de duas ou três
 * sessões, muitas vezes no meio da conversa, e um salvamento parcial não pode
 * apagar o bloco que foi preenchido semana passada.
 */
export async function salvarAnamnese(
  patientId: string,
  professionalId: string,
  respostas: Record<string, string>
) {
  await setDoc(
    doc(db, COLECAO, patientId),
    {
      patientId,
      professionalId,
      respostas,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/** Encerra: a partir daqui só entra adendo. */
export async function encerrarAnamnese(patientId: string) {
  await updateDoc(doc(db, COLECAO, patientId), { signedAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function adicionarAdendo(patientId: string, texto: string) {
  await updateDoc(doc(db, COLECAO, patientId), {
    // serverTimestamp não é aceito dentro de arrayUnion — a data vem do cliente,
    // e é por isso que o adendo mostra "registrado em", não "assinado em".
    addenda: arrayUnion({ texto: texto.trim(), createdAt: Timestamp.now() }),
    updatedAt: serverTimestamp(),
  });
}
