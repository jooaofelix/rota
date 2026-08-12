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
import type { Instrumento } from "@/data/instruments";
import { pontuar } from "@/utils/assessments";

const ASSESSMENTS = "assessments";

export function subscribeToAssessments(
  professionalId: string,
  patientId: string,
  callback: (itens: AssessmentDoc[]) => void
) {
  const q = query(
    collection(db, ASSESSMENTS),
    where("professionalId", "==", professionalId),
    where("patientId", "==", patientId)
  );
  return onSnapshot(q, (snap) => {
    const itens = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AssessmentDoc));
    // Mais recente primeiro; pendente ainda não tem data de resposta e sobe pelo
    // createdAt, que é quando ela mandou.
    callback(
      itens.sort(
        (a, b) =>
          (b.answeredAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0) -
          (a.answeredAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0)
      )
    );
  });
}

/** Aplicações pendentes de um paciente com conta — aparecem no app dele. */
export function subscribeToPendingAssessments(patientId: string, callback: (itens: AssessmentDoc[]) => void) {
  const q = query(
    collection(db, ASSESSMENTS),
    where("patientId", "==", patientId),
    where("status", "==", "pendente")
  );
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AssessmentDoc)))
  );
}

export async function criarAplicacao(
  token: string,
  dados: {
    professionalId: string;
    professionalName: string;
    patientId: string;
    patientName: string;
    instrumento: Instrumento;
    origem: AssessmentDoc["origem"];
  }
) {
  await setDoc(doc(db, ASSESSMENTS, token), {
    professionalId: dados.professionalId,
    professionalName: dados.professionalName,
    patientId: dados.patientId,
    patientName: dados.patientName,
    instrumentId: dados.instrumento.id,
    instrumentName: `${dados.instrumento.nome} (${dados.instrumento.sigla})`,
    origem: dados.origem,
    status: "pendente",
    createdAt: serverTimestamp(),
  });
}

/** Leitura pública enquanto pendente: quem tem o link responde sem conta. */
export async function getAssessment(token: string): Promise<AssessmentDoc | null> {
  const snap = await getDoc(doc(db, ASSESSMENTS, token));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as AssessmentDoc) : null;
}

/**
 * Grava as respostas já apuradas.
 *
 * A conta é feita aqui, no cliente de quem responde, e não depois na tela dela:
 * assim o resultado fica gravado junto com as respostas, e um dia em que a
 * fórmula mudar não reescreve o que já foi apurado.
 */
export async function responderAplicacao(token: string, instrumento: Instrumento, respostas: number[]) {
  const resultado = pontuar(instrumento, respostas);
  await updateDoc(doc(db, ASSESSMENTS, token), {
    status: "respondido",
    respostas,
    ...(resultado.total !== undefined ? { total: resultado.total } : {}),
    ...(resultado.fatores ? { fatores: resultado.fatores } : {}),
    ...(resultado.faixa ? { faixa: resultado.faixa } : {}),
    ...(resultado.tom ? { tom: resultado.tom } : {}),
    risco: resultado.risco ?? false,
    answeredAt: serverTimestamp(),
  });
}

/** Registro de resultado apurado fora do ROTA (BFP, BAI, escalas Wechsler). */
export async function registrarResultado(
  token: string,
  dados: {
    professionalId: string;
    professionalName: string;
    patientId: string;
    patientName: string;
    instrumento: Instrumento;
    instrumentoLivre?: string;
    valores: Record<string, number>;
    observacao?: string;
  }
) {
  const temPerfil = (dados.instrumento.campos?.length ?? 0) > 1;
  await setDoc(doc(db, ASSESSMENTS, token), {
    professionalId: dados.professionalId,
    professionalName: dados.professionalName,
    patientId: dados.patientId,
    patientName: dados.patientName,
    instrumentId: dados.instrumento.id,
    instrumentName: dados.instrumentoLivre?.trim()
      ? dados.instrumentoLivre.trim()
      : `${dados.instrumento.nome} (${dados.instrumento.sigla})`,
    origem: "registrado",
    status: "respondido",
    ...(temPerfil ? { fatores: dados.valores } : { total: Object.values(dados.valores)[0] ?? 0 }),
    ...(dados.instrumentoLivre?.trim() ? { instrumentoLivre: dados.instrumentoLivre.trim() } : {}),
    ...(dados.observacao?.trim() ? { observacao: dados.observacao.trim() } : {}),
    createdAt: serverTimestamp(),
    answeredAt: serverTimestamp(),
  });
}

export async function salvarObservacao(token: string, observacao: string) {
  await updateDoc(doc(db, ASSESSMENTS, token), { observacao: observacao.trim() });
}

export async function removerAplicacao(token: string) {
  await deleteDoc(doc(db, ASSESSMENTS, token));
}
