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
import { minutesOf } from "@/utils/agenda";
import { datasDaSerie } from "@/utils/conflitos";
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

/**
 * Erro de sessão repetida: o mesmo paciente já tem atendimento naquele horário.
 *
 * É uma classe própria porque quem chama precisa distinguir isso de uma falha de
 * rede. A importação em lote, por exemplo, pula a repetida e segue com o resto;
 * a tela de agendamento mostra o motivo em vez de "não consegui salvar".
 */
export class SessaoRepetidaError extends Error {
  constructor(public readonly existente: SessionDoc) {
    super(`Já existe atendimento de ${existente.patientName} em ${existente.date} às ${existente.startTime}.`);
    this.name = "SessaoRepetidaError";
  }
}

/**
 * A sessão não cancelada do mesmo paciente que já ocupa aquele horário, se houver.
 *
 * A consulta é por dia inteiro do paciente, e a sobreposição é conferida aqui: o
 * Firestore não sabe comparar faixas de hora, e um atendimento das 9h às 9h50 tem
 * de barrar outro das 9h20 às 10h, não só o que começa exatamente às 9h.
 */
export async function findOverlappingSession(
  professionalId: string,
  patientId: string,
  date: string,
  startTime: string,
  endTime: string,
  ignoreSessionId?: string
): Promise<SessionDoc | null> {
  // professionalId entra na consulta por causa das regras: sem ele, um paciente
  // que também é atendido por outra profissional derrubaria a leitura inteira.
  const snap = await getDocs(
    query(
      collection(db, SESSIONS),
      where("professionalId", "==", professionalId),
      where("patientId", "==", patientId),
      where("date", "==", date)
    )
  );
  const conflito = snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as SessionDoc))
    .find(
      (s) =>
        s.id !== ignoreSessionId &&
        s.status !== "cancelled" &&
        minutesOf(s.startTime) < minutesOf(endTime) &&
        minutesOf(s.endTime) > minutesOf(startTime)
    );
  return conflito ?? null;
}

/**
 * Cria a sessão, recusando duplicata do mesmo paciente no mesmo horário.
 *
 * A conferência mora aqui, e não só na tela, porque a agenda é criada por três
 * caminhos diferentes (agendamento, repetição e importação do Google) e um deles
 * já produziu duplicata na vida real.
 */
export async function createSession(data: NewSession): Promise<string> {
  const repetida = await findOverlappingSession(
    data.professionalId,
    data.patientId,
    data.date,
    data.startTime,
    data.endTime
  );
  if (repetida) throw new SessaoRepetidaError(repetida);

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
 *
 * Uma data que já tem aquele paciente no horário é pulada em vez de derrubar a
 * série inteira: quem repete oito semanas quer as sete que faltam, não um erro.
 */
export async function createRecurringSessions(data: NewSession, weeks: number, everyOtherWeek = false) {
  const ids: string[] = [];
  const puladas: string[] = [];
  for (const date of datasDaSerie(data.date, weeks, everyOtherWeek)) {
    try {
      ids.push(await createSession({ ...data, date }));
    } catch (erro) {
      if (erro instanceof SessaoRepetidaError) puladas.push(date);
      else throw erro;
    }
  }
  return Object.assign(ids, { puladas });
}

/** Sessões da profissional num intervalo, lidas uma vez (para conferir choque de horário). */
export async function getSessionsInRange(
  professionalId: string,
  start: string,
  end: string
): Promise<SessionDoc[]> {
  const snap = await getDocs(
    query(
      collection(db, SESSIONS),
      where("professionalId", "==", professionalId),
      where("date", ">=", start),
      where("date", "<=", end)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SessionDoc));
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
