import { Timestamp } from "firebase/firestore";
import type { OfferDoc, ProposalDoc } from "@/types";
import { PROFESSIONAL_ID } from "./demo-data";

export * from "../services/offers";

const now = Timestamp.now();

const OFFERS: OfferDoc[] = [
  { id: "o1", professionalId: PROFESSIONAL_ID, title: "Pacote mensal — 4 sessões", description: "Quatro encontros semanais, pagos de uma vez.", kind: "monthly", sessions: 4, price: 520, listPrice: 600, installments: 1, validityDays: 45, active: true, createdAt: now, updatedAt: now },
  { id: "o2", professionalId: PROFESSIONAL_ID, title: "Sessão avulsa", kind: "single", sessions: 1, price: 150, active: true, createdAt: now, updatedAt: now },
];

function dias(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const PROPOSALS: ProposalDoc[] = [
  { id: "p1", professionalId: PROFESSIONAL_ID, professionalName: "Dra. Camila Fernandes", patientId: "demo-ana", patientName: "Ana Beatriz", title: "Pacote mensal — 4 sessões", kind: "monthly", sessions: 4, price: 520, listPrice: 600, validUntil: dias(5), status: "sent", createdAt: now },
  { id: "p2", professionalId: PROFESSIONAL_ID, professionalName: "Dra. Camila Fernandes", patientId: "demo-larissa", patientName: "Larissa Souza", title: "Pacote trimestral — 12 sessões", kind: "package", sessions: 12, price: 1440, listPrice: 1800, installments: 3, validUntil: dias(-2), status: "accepted", replyNote: "Vamos sim! Pode mandar o pix.", createdAt: now },
  { id: "p3", professionalId: PROFESSIONAL_ID, professionalName: "Dra. Camila Fernandes", patientId: "demo-pedro", patientName: "Pedro Henrique", title: "Retorno — 4 sessões", kind: "package", sessions: 4, price: 480, listPrice: 600, validUntil: dias(-9), status: "sent", createdAt: now },
];

export function subscribeToOffers(_p: string, cb: (o: OfferDoc[]) => void) {
  cb(OFFERS);
  return () => undefined;
}
export function subscribeToProposals(_p: string, cb: (p: ProposalDoc[]) => void) {
  cb(PROPOSALS);
  return () => undefined;
}
export async function getProposal(token: string) {
  return PROPOSALS.find((p) => p.id === token) ?? PROPOSALS[0];
}
export async function createProposal() {
  return undefined;
}
