import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, doc, where, type WithFieldValue } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { CompletionDoc, EmotionRecordDoc, FeelingKey, RoutineItemDoc, SkipReasonKey } from "@/types";
import { todayKey } from "@/utils/date";

interface CompleteActivityInput {
  routineItem: RoutineItemDoc;
  status: "completed" | "partial";
  feeling: FeelingKey;
  comment?: string;
  neededHelp: boolean;
  approxMinutesUsed?: number;
}

/**
 * Id determinístico (item da rotina + dia): garante um único registro de conclusão por
 * atividade por dia, para que o paciente possa corrigir o status (ex.: de "parcial" para
 * "concluí totalmente") em vez de acumular registros duplicados e ambíguos no mesmo dia.
 */
function completionId(routineItemId: string, date: string): string {
  return `${routineItemId}_${date}`;
}

/** Marca uma atividade como concluída (total ou parcialmente) e registra o sentimento do paciente. */
export async function completeActivity(input: CompleteActivityInput): Promise<void> {
  const { routineItem, status, feeling, comment, neededHelp, approxMinutesUsed } = input;
  const date = todayKey();
  const id = completionId(routineItem.id, date);

  const pointsAwarded = status === "completed" ? routineItem.points : Math.round(routineItem.points / 2);

  await setDoc(doc(db, "completions", id), {
    routineItemId: routineItem.id,
    patientId: routineItem.patientId,
    date,
    status,
    feeling,
    comment: comment ?? "",
    neededHelp,
    approxMinutesUsed: approxMinutesUsed,
    pointsAwarded,
    completedAt: serverTimestamp(),
  } satisfies WithFieldValue<Omit<CompletionDoc, "id">>);

  await addDoc(collection(db, "emotionRecords"), {
    patientId: routineItem.patientId,
    completionId: id,
    routineItemId: routineItem.id,
    category: routineItem.category,
    feeling,
    date,
    createdAt: serverTimestamp(),
  } satisfies WithFieldValue<Omit<EmotionRecordDoc, "id">>);

  // Para atividades únicas (frequency "once") o status fica marcado permanentemente.
  // Atividades recorrentes (diária/semanal) mantêm status "pending" como padrão do dia
  // seguinte — o status de "hoje" é sempre derivado das conclusões (completions) da data.
  if (routineItem.frequency === "once") {
    await updateDoc(doc(db, "routineItems", routineItem.id), {
      status: status === "completed" ? "completed" : "partial",
    });
  }

  // Pontos, sequência (streak) e conquistas automáticas são calculados pela Cloud
  // Function `onCompletionCreate` (Admin SDK), disparada pela criação/atualização deste documento.
}

/** Registra que o paciente não conseguiu realizar a atividade, sem julgamento — apenas o motivo. */
export async function skipActivity(routineItem: RoutineItemDoc, reason: SkipReasonKey, otherText?: string): Promise<void> {
  const date = todayKey();
  const id = completionId(routineItem.id, date);

  await setDoc(doc(db, "completions", id), {
    routineItemId: routineItem.id,
    patientId: routineItem.patientId,
    date,
    status: "skipped",
    skipReason: reason,
    skipReasonOther: otherText ?? "",
    neededHelp: reason === "needed_help",
    pointsAwarded: 0,
    completedAt: serverTimestamp(),
  } satisfies WithFieldValue<Omit<CompletionDoc, "id">>);

  if (routineItem.frequency === "once") {
    await updateDoc(doc(db, "routineItems", routineItem.id), { status: "skipped" });
  }
}

export function subscribeToCompletionsForDate(patientId: string, date: string, callback: (items: CompletionDoc[]) => void) {
  const q = query(collection(db, "completions"), where("patientId", "==", patientId), where("date", "==", date));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CompletionDoc)));
  });
}

export function subscribeToPatientHistory(patientId: string, callback: (items: CompletionDoc[]) => void) {
  const q = query(
    collection(db, "completions"),
    where("patientId", "==", patientId),
    orderBy("completedAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CompletionDoc)));
  });
}
