import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { ReferralDoc } from "@/types";

const REFERRALS = "referrals";

export function subscribeToPatientReferrals(
  patientId: string,
  callback: (items: ReferralDoc[]) => void
) {
  const q = query(collection(db, REFERRALS), where("patientId", "==", patientId));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ReferralDoc));
    callback(items.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)));
  });
}

export async function recordReferral(data: Omit<ReferralDoc, "id" | "createdAt">) {
  await addDoc(collection(db, REFERRALS), { ...data, createdAt: serverTimestamp() });
}

export async function removeReferral(id: string) {
  await deleteDoc(doc(db, REFERRALS, id));
}
