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
  type WithFieldValue,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import type { RoomPartnerDoc, RoomSlotDoc } from "@/types";

const PARTNERS = "roomPartners";
const SLOTS = "roomSlots";

export function subscribeToPartners(professionalId: string, callback: (partners: RoomPartnerDoc[]) => void) {
  const q = query(collection(db, PARTNERS), where("professionalId", "==", professionalId));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoomPartnerDoc));
    callback(items.filter((p) => p.active !== false).sort((a, b) => a.name.localeCompare(b.name)));
  });
}

export async function savePartner(
  existingId: string | null,
  data: Omit<RoomPartnerDoc, "id" | "createdAt">
): Promise<string> {
  if (existingId) {
    await updateDoc(doc(db, PARTNERS, existingId), data);
    return existingId;
  }
  const ref = await addDoc(collection(db, PARTNERS), {
    ...data,
    createdAt: serverTimestamp(),
  } satisfies WithFieldValue<Omit<RoomPartnerDoc, "id">>);
  return ref.id;
}

/** Remoção lógica: os horários já registrados continuam fazendo sentido no histórico. */
export async function deactivatePartner(partnerId: string) {
  await updateDoc(doc(db, PARTNERS, partnerId), { active: false });
}

export function subscribeToRoomSlots(professionalId: string, callback: (slots: RoomSlotDoc[]) => void) {
  const q = query(collection(db, SLOTS), where("professionalId", "==", professionalId));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoomSlotDoc));
    callback(
      items
        .filter((s) => s.active !== false)
        .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime))
    );
  });
}

type NewSlot = Omit<RoomSlotDoc, "id" | "createdAt" | "updatedAt">;

export async function createSlot(data: NewSlot): Promise<string> {
  const ref = await addDoc(collection(db, SLOTS), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } satisfies WithFieldValue<Omit<RoomSlotDoc, "id">>);
  return ref.id;
}

export async function updateSlot(slotId: string, data: Partial<RoomSlotDoc>) {
  await updateDoc(doc(db, SLOTS, slotId), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteSlot(slotId: string) {
  await deleteDoc(doc(db, SLOTS, slotId));
}

/**
 * Um horário que cobre várias faixas seguidas — como na planilha, onde alguém
 * ocupa das 7h às 12h — é criado de uma vez, não faixa por faixa.
 */
export async function createSlotsForWeekdays(base: Omit<NewSlot, "weekday">, weekdays: number[]) {
  const ids: string[] = [];
  for (const weekday of weekdays) {
    ids.push(await createSlot({ ...base, weekday }));
  }
  return ids;
}
