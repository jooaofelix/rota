import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import type { AssessmentDoc } from "@/types";
import type { Questionario } from "@/data/schemaQuestionnaires";
import { apurar } from "@/utils/schemaScoring";

const COLECAO = "assessments";

export function subscribeToAssessments(
  professionalId: string,
  patientId: string,
  callback: (itens: AssessmentDoc[]) => void
) {
  const q = query(
    collection(db, COLECAO),
    where("professionalId", "==", professionalId),
    where("patientId", "==", patientId)
  );
  return onSnapshot(q, (snap) => {
    const itens = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AssessmentDoc));
    callback(
      itens.sort(
        (a, b) =>
          (b.answeredAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0) -
          (a.answeredAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0)
      )
    );
  });
}

export async function criarAplicacao(
  token: string,
  dados: {
    professionalId: string;
    professionalName: string;
    patientId: string;
    patientName: string;
    questionario: Questionario;
  }
) {
  await setDoc(doc(db, COLECAO, token), {
    professionalId: dados.professionalId,
    professionalName: dados.professionalName,
    patientId: dados.patientId,
    patientName: dados.patientName,
    questionarioId: dados.questionario.id,
    questionarioNome: `${dados.questionario.nome} (${dados.questionario.sigla})`,
    status: "pendente",
    createdAt: serverTimestamp(),
  });
}

/** Leitura aberta enquanto pendente: quem tem o link responde sem conta. */
export async function getAssessment(token: string): Promise<AssessmentDoc | null> {
  const snap = await getDoc(doc(db, COLECAO, token));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as AssessmentDoc) : null;
}

/**
 * Grava as respostas com o resultado já apurado.
 *
 * A conta acontece aqui, junto da gravação, e não na hora de mostrar: assim o
 * que ela lê daqui a um ano é o resultado daquele dia, e não o que a fórmula
 * de hoje diria sobre respostas antigas.
 */
export async function responder(
  token: string,
  questionario: Questionario,
  respostas: number[],
  respostasPai?: number[]
) {
  const r = apurar(questionario, respostas, respostasPai);
  await updateDoc(doc(db, COLECAO, token), {
    status: "respondido",
    respostas,
    ...(respostasPai ? { respostasPai } : {}),
    ...(r.fatores ? { fatores: r.fatores } : {}),
    ...(r.fatoresPai ? { fatoresPai: r.fatoresPai } : {}),
    ...(r.media !== undefined ? { media: r.media } : {}),
    answeredAt: serverTimestamp(),
  });
}

export async function salvarObservacao(token: string, observacao: string) {
  await updateDoc(doc(db, COLECAO, token), { observacao: observacao.trim() });
}

export async function removerAplicacao(token: string) {
  await deleteDoc(doc(db, COLECAO, token));
}
