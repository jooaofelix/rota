import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type WithFieldValue,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import type { PaymentStatus, SessionDoc, SessionRecordDoc } from "@/types";
import { todayKey } from "@/utils/date";

const SESSIONS = "sessions";
const RECORDS = "sessionRecords";

type NewSession = Omit<SessionDoc, "id" | "createdAt" | "updatedAt">;

/** Sessões da profissional num intervalo de datas (yyyy-MM-dd), para a agenda da semana. */
export function subscribeToSessionsInRange(
  professionalId: string,
  start: string,
  end: string,
  callback: (sessions: SessionDoc[]) => void
) {
  const q = query(
    collection(db, SESSIONS),
    where("professionalId", "==", professionalId),
    where("date", ">=", start),
    where("date", "<=", end)
  );
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SessionDoc));
    callback(items.sort(byDateTime));
  });
}

/** As próximas sessões a partir de hoje — alimenta o cartão "Próximas sessões". */
export function subscribeToUpcomingSessions(
  professionalId: string,
  callback: (sessions: SessionDoc[]) => void,
  max = 20
) {
  const q = query(
    collection(db, SESSIONS),
    where("professionalId", "==", professionalId),
    where("date", ">=", todayKey()),
    orderBy("date"),
    limit(max)
  );
  return onSnapshot(q, (snap) => {
    const items = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as SessionDoc))
      .filter((s) => s.status !== "cancelled");
    callback(items.sort(byDateTime));
  });
}

export function subscribeToPatientSessions(patientId: string, callback: (sessions: SessionDoc[]) => void) {
  const q = query(collection(db, SESSIONS), where("patientId", "==", patientId));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SessionDoc)).sort(byDateTime));
  });
}

function byDateTime(a: SessionDoc, b: SessionDoc) {
  return `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`);
}

export async function createSession(data: NewSession): Promise<string> {
  const ref = await addDoc(collection(db, SESSIONS), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } satisfies WithFieldValue<Omit<SessionDoc, "id">>);
  return ref.id;
}

/**
 * Repete a sessão nas semanas seguintes. Atendimento psicológico costuma ser um
 * horário fixo semanal ou quinzenal, então criar uma a uma seria trabalho manual puro.
 */
export async function createRecurringSessions(data: NewSession, weeks: number, everyOtherWeek = false) {
  const step = everyOtherWeek ? 14 : 7;
  const ids: string[] = [];
  for (let i = 0; i < weeks; i++) {
    const date = addDays(data.date, i * step);
    ids.push(await createSession({ ...data, date }));
  }
  return ids;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function updateSession(sessionId: string, data: Partial<SessionDoc>) {
  await updateDoc(doc(db, SESSIONS, sessionId), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteSession(sessionId: string) {
  await deleteDoc(doc(db, SESSIONS, sessionId));
}

export async function setPaymentStatus(sessionId: string, status: PaymentStatus, method?: SessionDoc["paymentMethod"]) {
  await updateSession(sessionId, {
    paymentStatus: status,
    ...(method ? { paymentMethod: method } : {}),
    ...(status === "paid" ? { paidAt: serverTimestamp() as never } : {}),
  });
}

// ---------------------------------------------------------------- prontuário

export function subscribeToPatientRecords(patientId: string, callback: (records: SessionRecordDoc[]) => void) {
  const q = query(collection(db, RECORDS), where("patientId", "==", patientId));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SessionRecordDoc));
    callback(items.sort((a, b) => b.date.localeCompare(a.date)));
  });
}

/** O registro de uma sessão específica, se já existir. */
export async function getRecordForSession(sessionId: string): Promise<SessionRecordDoc | null> {
  const snap = await getDocs(query(collection(db, RECORDS), where("sessionId", "==", sessionId), limit(1)));
  const first = snap.docs[0];
  return first ? ({ id: first.id, ...first.data() } as SessionRecordDoc) : null;
}

type NewRecord = Omit<SessionRecordDoc, "id" | "createdAt" | "updatedAt">;

export async function saveRecord(existingId: string | null, data: NewRecord): Promise<string> {
  if (existingId) {
    await updateDoc(doc(db, RECORDS, existingId), { ...data, updatedAt: serverTimestamp() });
    return existingId;
  }
  const ref = await addDoc(collection(db, RECORDS), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } satisfies WithFieldValue<Omit<SessionRecordDoc, "id">>);
  return ref.id;
}

/** Fecha o registro. Depois disso o conteúdo não muda mais — correção vira adendo. */
export async function signRecord(recordId: string) {
  await updateDoc(doc(db, RECORDS, recordId), { signedAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function addAddendum(record: SessionRecordDoc, text: string) {
  const addenda = [...(record.addenda ?? []), { text, createdAt: new Date() as never }];
  await updateDoc(doc(db, RECORDS, record.id), { addenda, updatedAt: serverTimestamp() });
}

/** Todos os registros da profissional, para a tela que reúne os prontuários. */
export function subscribeToProfessionalRecords(
  professionalId: string,
  callback: (records: SessionRecordDoc[]) => void
) {
  const q = query(collection(db, RECORDS), where("professionalId", "==", professionalId));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SessionRecordDoc));
    callback(items.sort((a, b) => b.date.localeCompare(a.date)));
  });
}

/** Os registros de um paciente, buscados uma vez (para montar o PDF do relatório). */
export async function fetchPatientRecords(patientId: string): Promise<SessionRecordDoc[]> {
  const snap = await getDocs(query(collection(db, RECORDS), where("patientId", "==", patientId)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as SessionRecordDoc))
    .sort((a, b) => a.date.localeCompare(b.date));
}
