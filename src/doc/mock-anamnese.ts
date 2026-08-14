/** Mock da anamnese, só para as capturas de tela. */
import { Timestamp } from "firebase/firestore";
import type { AnamneseDoc } from "@/types";

const DEMO: AnamneseDoc = {
  id: "demo-ana",
  patientId: "demo-ana",
  professionalId: "pro",
  respostas: {
    "identificacao.idade": "34",
    "identificacao.estadoCivil": "Casada(o)/união",
    "identificacao.ocupacao": "Analista financeira",
    "identificacao.comQuemMora": "Marido e uma filha de 6 anos",
    "demanda.queixa": "\"Sinto que estou sempre no limite e qualquer coisa me derruba.\"",
    "demanda.inicio": "Há cerca de oito meses, depois da promoção no trabalho",
    "risco.ideacao": "Passiva (vontade de sumir)",
  },
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
};

export function subscribeToAnamnese(_p: string, callback: (a: AnamneseDoc | null) => void) {
  callback(DEMO);
  return () => {};
}
export async function getAnamnese() {
  return DEMO;
}
export async function salvarAnamnese() {}
export async function encerrarAnamnese() {}
export async function adicionarAdendo() {}
