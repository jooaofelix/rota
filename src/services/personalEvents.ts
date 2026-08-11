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
import type { PersonalEventDoc } from "@/types";

const EVENTS = "personalEvents";

export function subscribeToPersonalEventsInRange(
  professionalId: string,
  start: string,
  end: string,
  callback: (items: PersonalEventDoc[]) => void
) {
  const q = query(
    collection(db, EVENTS),
    where("professionalId", "==", professionalId),
    where("date", ">=", start),
    where("date", "<=", end)
  );
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PersonalEventDoc));
    callback(items.sort(byDateTime));
  });
}

/** Sem hora vai para o fim do dia: é demanda, não compromisso marcado. */
function byDateTime(a: PersonalEventDoc, b: PersonalEventDoc) {
  return `${a.date} ${a.startTime ?? "99:99"}`.localeCompare(`${b.date} ${b.startTime ?? "99:99"}`);
}

export async function savePersonalEvent(
  existingId: string | null,
  data: Omit<PersonalEventDoc, "id" | "createdAt" | "updatedAt">
) {
  if (existingId) {
    await updateDoc(doc(db, EVENTS, existingId), { ...data, updatedAt: serverTimestamp() });
    return existingId;
  }
  const ref = await addDoc(collection(db, EVENTS), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function setPersonalEventDone(id: string, done: boolean) {
  await updateDoc(doc(db, EVENTS, id), { done, updatedAt: serverTimestamp() });
}

export async function removePersonalEvent(id: string) {
  await deleteDoc(doc(db, EVENTS, id));
}
