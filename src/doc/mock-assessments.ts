/** Mocks das aplicações de questionário, só para as capturas de tela. */
import { Timestamp } from "firebase/firestore";
import type { AssessmentDoc } from "@/types";
import { QUESTIONARIOS } from "@/data/schemaQuestionnaires";

const agora = Timestamp.fromDate(new Date(2026, 7, 10));

/** Médias plausíveis: alguns esquemas acima do corte, a maioria abaixo. */
const FATORES_YSQ: Record<string, number> = {
  e1: 4.6, e2: 5.2, e3: 3.4, e4: 2.8, e5: 4.2, e6: 2.2, e7: 3.0, e8: 4.8, e9: 2.4,
  e10: 3.8, e11: 4.4, e12: 3.2, e13: 2.6, e14: 1.8, e15: 2.0, e16: 3.6, e17: 2.8, e18: 3.0,
};

const DEMO: AssessmentDoc[] = [
  {
    id: "a1",
    professionalId: "pro",
    professionalName: "Dra. Sinara",
    patientId: "demo-ana",
    patientName: "Ana Beatriz Souza",
    questionarioId: "ysq",
    questionarioNome: "Questionário de Esquemas (YSQ-S3)",
    status: "respondido",
    fatores: FATORES_YSQ,
    observacao: "Abandono e Vulnerabilidade aparecem juntos, como no relato da separação dos pais.",
    createdAt: agora,
    answeredAt: agora,
  } as AssessmentDoc,
  {
    id: "a2",
    professionalId: "pro",
    professionalName: "Dra. Sinara",
    patientId: "demo-ana",
    patientName: "Ana Beatriz Souza",
    questionarioId: "yami",
    questionarioNome: "Inventário de Modos Esquemáticos (YAMI-PM2)",
    status: "pendente",
    createdAt: agora,
  } as AssessmentDoc,
];

export function subscribeToAssessments(
  _professionalId: string,
  _patientId: string,
  callback: (itens: AssessmentDoc[]) => void
) {
  callback(DEMO);
  return () => {};
}

export async function criarAplicacao() {}
export async function getAssessment(): Promise<AssessmentDoc | null> {
  return {
    id: "t1",
    professionalId: "pro",
    professionalName: "Dra. Sinara",
    patientId: "demo-ana",
    patientName: "Ana Beatriz Souza",
    questionarioId: QUESTIONARIOS[0].id,
    questionarioNome: "Questionário de Esquemas (YSQ-S3)",
    status: "pendente",
    createdAt: agora,
  } as AssessmentDoc;
}
export async function responder() {}
export async function salvarObservacao() {}
export async function removerAplicacao() {}
