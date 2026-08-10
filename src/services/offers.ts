import {
  addDoc,
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
import type { OfferDoc, ProposalDoc } from "@/types";

const OFFERS = "offers";
const PROPOSALS = "proposals";

/* ---------------- catálogo ---------------- */

export function subscribeToOffers(professionalId: string, callback: (offers: OfferDoc[]) => void) {
  const q = query(collection(db, OFFERS), where("professionalId", "==", professionalId));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as OfferDoc));
    callback(items.filter((o) => o.active).sort((a, b) => a.price - b.price));
  });
}

export async function saveOffer(
  existingId: string | null,
  data: Omit<OfferDoc, "id" | "createdAt" | "updatedAt" | "active">
) {
  if (existingId) {
    await updateDoc(doc(db, OFFERS, existingId), { ...data, updatedAt: serverTimestamp() });
    return existingId;
  }
  const ref = await addDoc(collection(db, OFFERS), {
    ...data,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function removeOffer(id: string) {
  await deleteDoc(doc(db, OFFERS, id));
}

/* ---------------- propostas ---------------- */

/** Código do link de aceite. Sorteado no cliente para o e-mail já sair com ele. */
export function newProposalToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export function proposalLink(token: string): string {
  return `${window.location.origin}/proposta/${token}`;
}

export async function createProposal(
  token: string,
  data: Omit<ProposalDoc, "id" | "status" | "createdAt" | "respondedAt">
) {
  await setDoc(doc(db, PROPOSALS, token), {
    ...data,
    status: "sent",
    createdAt: serverTimestamp(),
  });
}

export function subscribeToProposals(professionalId: string, callback: (items: ProposalDoc[]) => void) {
  const q = query(collection(db, PROPOSALS), where("professionalId", "==", professionalId));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProposalDoc));
    callback(items.sort((a, b) => b.validUntil.localeCompare(a.validUntil)));
  });
}

export async function removeProposal(token: string) {
  await deleteDoc(doc(db, PROPOSALS, token));
}

/** Leitura pública: quem tem o código do link consegue ver a proposta. */
export async function getProposal(token: string): Promise<ProposalDoc | null> {
  const snap = await getDoc(doc(db, PROPOSALS, token));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as ProposalDoc) : null;
}

export async function respondToProposal(
  token: string,
  status: "accepted" | "declined",
  replyNote?: string
) {
  await updateDoc(doc(db, PROPOSALS, token), {
    status,
    replyNote: replyNote?.trim() ?? "",
    respondedAt: serverTimestamp(),
  });
}

/** Vencida é diferente de recusada: ninguém respondeu e o prazo passou. */
export function isExpired(proposal: ProposalDoc, today: string): boolean {
  return proposal.status === "sent" && proposal.validUntil < today;
}
