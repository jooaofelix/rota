import {
  collection,
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
import type { RoomRequestDoc } from "@/types";

const REQUESTS = "roomRequests";

/** Código do link de resposta. Sorteado no cliente para o e-mail já sair com ele. */
export function newRequestToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export function requestLink(token: string, answer: "sim" | "nao"): string {
  return `${window.location.origin}/sala/resposta/${token}?r=${answer}`;
}

export async function createRoomRequest(
  token: string,
  data: Omit<RoomRequestDoc, "id" | "status" | "createdAt" | "respondedAt">
) {
  await setDoc(doc(db, REQUESTS, token), {
    ...data,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

export function subscribeToRoomRequests(
  professionalId: string,
  callback: (requests: RoomRequestDoc[]) => void
) {
  const q = query(collection(db, REQUESTS), where("professionalId", "==", professionalId));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoomRequestDoc));
    callback(items.sort((a, b) => `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`)));
  });
}

/** Leitura pública: quem tem o código do link consegue ver o pedido. */
export async function getRoomRequest(token: string): Promise<RoomRequestDoc | null> {
  const snap = await getDoc(doc(db, REQUESTS, token));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as RoomRequestDoc) : null;
}

export async function respondToRoomRequest(
  token: string,
  status: "confirmed" | "declined",
  replyNote?: string
) {
  await updateDoc(doc(db, REQUESTS, token), {
    status,
    replyNote: replyNote?.trim() ?? "",
    respondedAt: serverTimestamp(),
  });
}
