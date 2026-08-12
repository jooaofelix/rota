import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { CompletionDoc, FeelingKey, PatientDoc, RoutineItemDoc, UserDoc } from "@/types";
import { getTodayStatus, isScheduledOn } from "@/utils/schedule";
import { todayKey } from "@/utils/date";

export interface PatientOverview {
  patientId: string;
  name: string;
  photoURL?: string;
  points: number;
  currentStreak: number;
  lastAccessAt?: Date;
  /** Para o cartão de aniversariantes do mês. */
  birthDate?: Date;
  /** false para quem foi arquivado: alta, desistência ou fim de acompanhamento. */
  active: boolean;
  todayCompleted: number;
  todayTotal: number;
  todayPending: number;
  todayLate: number;
  lastFeeling?: FeelingKey;
  weekCompletionRate: number;
  hasAttentionAlert: boolean;
  alerts: string[];
}

/** Monta a visão consolidada de um paciente para o dashboard/lista da profissional. */
export async function getPatientOverview(patientId: string): Promise<PatientOverview> {
  const [userSnap, patientSnap, itemsSnap, completionsSnap] = await Promise.all([
    getDoc(doc(db, "users", patientId)),
    getDoc(doc(db, "patients", patientId)),
    getDocs(query(collection(db, "routineItems"), where("patientId", "==", patientId), where("active", "==", true))),
    getDocs(query(collection(db, "completions"), where("patientId", "==", patientId))),
  ]);

  const user = userSnap.exists() ? (userSnap.data() as UserDoc) : undefined;
  const patient = patientSnap.exists() ? (patientSnap.data() as PatientDoc) : undefined;
  const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as RoutineItemDoc));
  const completions = completionsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as CompletionDoc));

  const todayItems = items.filter((i) => isScheduledOn(i));
  const todayDate = todayKey();
  const todayCompletions = new Map(completions.filter((c) => c.date === todayDate).map((c) => [c.routineItemId, c]));

  const todayStatuses = todayItems.map((item) => getTodayStatus(item, todayCompletions.get(item.id)));
  const todayCompleted = todayStatuses.filter((s) => s === "completed").length;
  const todayPending = todayStatuses.filter((s) => s === "pending").length;
  const todayLate = todayStatuses.filter((s) => s === "late").length;

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return todayKey(d);
  });
  const weekCompletions = completions.filter((c) => last7Days.includes(c.date));
  const weekScheduledCount = last7Days.reduce((acc, dateKey) => {
    const date = new Date(dateKey);
    return acc + items.filter((i) => isScheduledOn(i, date)).length;
  }, 0);
  const weekCompletionRate = weekScheduledCount
    ? Math.round((weekCompletions.filter((c) => c.status === "completed").length / weekScheduledCount) * 100)
    : 0;

  const sortedCompletions = [...completions].sort((a, b) => b.date.localeCompare(a.date));
  const lastFeeling = sortedCompletions.find((c) => c.feeling)?.feeling;

  const recentSkipped = completions.filter((c) => c.date === todayDate || last7Days.slice(0, 3).includes(c.date));
  const anxiousOrSadCount = recentSkipped.filter((c) => c.feeling === "anxious" || c.feeling === "sad").length;
  const difficultyCount = recentSkipped.filter((c) => c.feeling === "difficulty" || c.feeling === "needed_help").length;

  const alerts: string[] = [];
  const lastAccessAt = patient?.lastAccessAt?.toDate?.();
  const daysSinceAccess = lastAccessAt ? Math.floor((Date.now() - lastAccessAt.getTime()) / 86400000) : null;
  if (daysSinceAccess !== null && daysSinceAccess >= 3) alerts.push(`Sem acessar o app há ${daysSinceAccess} dias`);
  if (todayLate >= 3) alerts.push("Muitas atividades atrasadas hoje");
  if (anxiousOrSadCount >= 3) alerts.push("Várias respostas de ansiedade/tristeza recentes");
  if (difficultyCount >= 3) alerts.push("Várias atividades com dificuldade/ajuda recentes");
  if (weekCompletionRate < 40 && weekScheduledCount > 0) alerts.push("Queda na conclusão das atividades");

  return {
    patientId,
    name: user?.name ?? patient?.name ?? "Paciente",
    birthDate: patient?.birthDate?.toDate?.(),
    active: patient?.active !== false,
    photoURL: user?.photoURL ?? patient?.photoURL,
    points: patient?.points ?? 0,
    currentStreak: patient?.currentStreak ?? 0,
    lastAccessAt,
    todayCompleted,
    todayTotal: todayItems.length,
    todayPending,
    todayLate,
    lastFeeling,
    weekCompletionRate,
    hasAttentionAlert: alerts.length > 0,
    alerts,
  };
}

export async function getPatientsOverview(patientIds: string[]): Promise<PatientOverview[]> {
  return Promise.all(patientIds.map(getPatientOverview));
}
