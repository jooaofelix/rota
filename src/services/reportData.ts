import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { CompletionDoc, RoutineItemDoc } from "@/types";
import { CATEGORY_LABELS, FEELING_OPTIONS } from "@/utils/constants";
import { isScheduledOn } from "@/utils/schedule";

export interface ReportData {
  totalScheduled: number;
  totalCompleted: number;
  totalPartial: number;
  totalSkipped: number;
  completionRate: number;
  feelingCounts: Array<{ label: string; emoji: string; count: number }>;
  categoryAdherence: Array<{ label: string; rate: number }>;
  notRealized: Array<{ title: string; date: string; reason?: string }>;
  comments: Array<{ title: string; date: string; comment: string; feeling?: string }>;
  totalPoints: number;
}

/** Reúne os dados de um paciente em um período para compor um relatório. */
export async function getReportData(patientId: string, periodStart: string, periodEnd: string): Promise<ReportData> {
  const [itemsSnap, completionsSnap] = await Promise.all([
    getDocs(query(collection(db, "routineItems"), where("patientId", "==", patientId), where("active", "==", true))),
    getDocs(query(collection(db, "completions"), where("patientId", "==", patientId))),
  ]);

  const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as RoutineItemDoc));
  const allCompletions = completionsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as CompletionDoc));
  const completions = allCompletions.filter((c) => c.date >= periodStart && c.date <= periodEnd);
  const itemById = new Map(items.map((i) => [i.id, i]));

  let totalScheduled = 0;
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    totalScheduled += items.filter((item) => isScheduledOn(item, new Date(d))).length;
  }

  const totalCompleted = completions.filter((c) => c.status === "completed").length;
  const totalPartial = completions.filter((c) => c.status === "partial").length;
  const totalSkipped = completions.filter((c) => c.status === "skipped").length;
  const completionRate = totalScheduled ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

  const feelingMap = new Map<string, number>();
  completions.forEach((c) => c.feeling && feelingMap.set(c.feeling, (feelingMap.get(c.feeling) ?? 0) + 1));
  const feelingCounts = FEELING_OPTIONS.map((f) => ({ label: f.label, emoji: f.emoji, count: feelingMap.get(f.key) ?? 0 }))
    .filter((f) => f.count > 0)
    .sort((a, b) => b.count - a.count);

  const categoryMap = new Map<string, { total: number; completed: number }>();
  completions.forEach((c) => {
    const item = itemById.get(c.routineItemId);
    if (!item) return;
    const entry = categoryMap.get(item.category) ?? { total: 0, completed: 0 };
    entry.total += 1;
    if (c.status === "completed") entry.completed += 1;
    categoryMap.set(item.category, entry);
  });
  const categoryAdherence = Array.from(categoryMap.entries())
    .map(([category, { total, completed }]) => ({
      label: CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ?? category,
      rate: total ? Math.round((completed / total) * 100) : 0,
    }))
    .sort((a, b) => b.rate - a.rate);

  const notRealized = completions
    .filter((c) => c.status === "skipped")
    .map((c) => ({ title: itemById.get(c.routineItemId)?.title ?? "Atividade", date: c.date, reason: c.skipReason }));

  const comments = completions
    .filter((c) => c.comment)
    .map((c) => ({ title: itemById.get(c.routineItemId)?.title ?? "Atividade", date: c.date, comment: c.comment ?? "", feeling: c.feeling }));

  const totalPoints = completions.reduce((acc, c) => acc + (c.pointsAwarded ?? 0), 0);

  return { totalScheduled, totalCompleted, totalPartial, totalSkipped, completionRate, feelingCounts, categoryAdherence, notRealized, comments, totalPoints };
}
