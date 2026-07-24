import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import type { RoutineDoc, RoutineItemDoc } from "@/types";
import { createNotification } from "./notifications";

export function subscribeToPatientRoutines(patientId: string, callback: (routines: RoutineDoc[]) => void) {
  const q = query(collection(db, "routines"), where("patientId", "==", patientId));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as RoutineDoc)));
  });
}

export function subscribeToRoutineItems(patientId: string, callback: (items: RoutineItemDoc[]) => void) {
  const q = query(collection(db, "routineItems"), where("patientId", "==", patientId), where("active", "==", true));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as RoutineItemDoc)));
  });
}

export async function createRoutine(
  professionalId: string,
  patientId: string,
  data: Pick<RoutineDoc, "title" | "description" | "templateKind">
): Promise<string> {
  const ref = await addDoc(collection(db, "routines"), {
    ...data,
    patientId,
    professionalId,
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateRoutine(routineId: string, data: Partial<RoutineDoc>) {
  await updateDoc(doc(db, "routines", routineId), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteRoutine(routineId: string) {
  await deleteDoc(doc(db, "routines", routineId));
}

export async function createRoutineItem(
  data: Omit<RoutineItemDoc, "id" | "createdAt" | "updatedAt" | "status" | "active">,
  notifyPatient: boolean
): Promise<string> {
  const ref = await addDoc(collection(db, "routineItems"), {
    ...data,
    status: "pending",
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (notifyPatient) {
    await createNotification({
      recipientId: data.patientId,
      type: "new_activity",
      title: "Nova atividade na sua rotina",
      body: `"${data.title}" foi adicionada à sua rotina.`,
      routineItemId: ref.id,
      url: "/rotina",
    });
  }

  return ref.id;
}

export async function updateRoutineItem(itemId: string, data: Partial<RoutineItemDoc>, notifyPatient: boolean) {
  await updateDoc(doc(db, "routineItems", itemId), { ...data, updatedAt: serverTimestamp() });

  if (notifyPatient && data.patientId) {
    await createNotification({
      recipientId: data.patientId,
      type: "activity_changed",
      title: "Uma atividade foi atualizada",
      body: `"${data.title ?? "Sua atividade"}" foi alterada pela sua profissional.`,
      routineItemId: itemId,
      url: "/rotina",
    });
  }
}

export async function duplicateRoutineItem(item: RoutineItemDoc): Promise<string> {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = item;
  const ref = await addDoc(collection(db, "routineItems"), {
    ...rest,
    title: `${item.title} (cópia)`,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteRoutineItem(itemId: string) {
  await updateDoc(doc(db, "routineItems", itemId), { active: false, updatedAt: serverTimestamp() });
}

export async function reorderRoutineItems(items: Array<{ id: string; order: number }>) {
  const batch = writeBatch(db);
  items.forEach(({ id, order }) => {
    batch.update(doc(db, "routineItems", id), { order });
  });
  await batch.commit();
}

export async function copyRoutineToPatient(
  sourceItems: RoutineItemDoc[],
  targetPatientId: string,
  professionalId: string,
  routineTitle: string
) {
  const routineId = await createRoutine(professionalId, targetPatientId, {
    title: routineTitle,
    description: "",
    templateKind: "custom",
  });

  const batch = writeBatch(db);
  sourceItems.forEach((item) => {
    const ref = doc(collection(db, "routineItems"));
    const { id: _id, createdAt: _c, updatedAt: _u, patientId: _p, routineId: _r, ...rest } = item;
    batch.set(ref, {
      ...rest,
      routineId,
      patientId: targetPatientId,
      professionalId,
      status: "pending",
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();

  return routineId;
}
