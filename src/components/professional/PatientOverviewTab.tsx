import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { CompletionDoc, RoutineItemDoc } from "@/types";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { CATEGORY_LABELS, FEELING_OPTIONS } from "@/utils/constants";
import { isScheduledOn } from "@/utils/schedule";
import { todayKey } from "@/utils/date";

export function PatientOverviewTab({ patientId }: { patientId: string }) {
  const [items, setItems] = useState<RoutineItemDoc[] | null>(null);
  const [completions, setCompletions] = useState<CompletionDoc[] | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      getDocs(query(collection(db, "routineItems"), where("patientId", "==", patientId), where("active", "==", true))),
      getDocs(query(collection(db, "completions"), where("patientId", "==", patientId))),
    ]).then(([itemsSnap, completionsSnap]) => {
      if (!active) return;
      setItems(itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as RoutineItemDoc)));
      setCompletions(completionsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as CompletionDoc)));
    });
    return () => {
      active = false;
    };
  }, [patientId]);

  const weekData = useMemo(() => {
    if (!items || !completions) return [];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateKey = todayKey(d);
      const scheduled = items.filter((item) => isScheduledOn(item, d)).length;
      const completed = completions.filter((c) => c.date === dateKey && c.status === "completed").length;
      return { day: d.toLocaleDateString("pt-BR", { weekday: "short" }), completed, scheduled };
    });
  }, [items, completions]);

  const feelingCounts = useMemo(() => {
    if (!completions) return [];
    const map = new Map<string, number>();
    completions.forEach((c) => c.feeling && map.set(c.feeling, (map.get(c.feeling) ?? 0) + 1));
    return FEELING_OPTIONS.map((f) => ({ ...f, count: map.get(f.key) ?? 0 })).filter((f) => f.count > 0).sort((a, b) => b.count - a.count);
  }, [completions]);

  const categoryStats = useMemo(() => {
    if (!items || !completions) return [];
    const byCategory = new Map<string, { total: number; completed: number }>();
    completions.forEach((c) => {
      const item = items.find((i) => i.id === c.routineItemId);
      if (!item) return;
      const entry = byCategory.get(item.category) ?? { total: 0, completed: 0 };
      entry.total += 1;
      if (c.status === "completed") entry.completed += 1;
      byCategory.set(item.category, entry);
    });
    return Array.from(byCategory.entries())
      .map(([category, { total, completed }]) => ({ category, rate: total ? Math.round((completed / total) * 100) : 0, total }))
      .sort((a, b) => b.rate - a.rate);
  }, [items, completions]);

  const totalCompleted = completions?.filter((c) => c.status === "completed").length ?? 0;
  const totalTracked = completions?.length ?? 0;
  const overallRate = totalTracked ? Math.round((totalCompleted / totalTracked) * 100) : 0;
  const difficultyCount = completions?.filter((c) => c.feeling === "difficulty" || c.feeling === "needed_help").length ?? 0;
  const notDoneCount = completions?.filter((c) => c.status === "skipped").length ?? 0;

  if (!items || !completions) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Taxa geral" value={`${overallRate}%`} />
        <MiniStat label="Com dificuldade" value={difficultyCount} />
        <MiniStat label="Não realizadas" value={notDoneCount} />
      </div>

      <div className="card">
        <p className="mb-2 text-sm font-bold text-brand-700">Atividades concluídas nos últimos 7 dias</p>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekData}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip />
              <Bar dataKey="completed" fill="#2f9a7c" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {feelingCounts.length > 0 && (
        <div className="card">
          <p className="mb-2 text-sm font-bold text-brand-700">Sentimentos mais escolhidos</p>
          <div className="flex flex-col gap-1.5">
            {feelingCounts.map((f) => (
              <div key={f.key} className="flex items-center gap-2 text-sm">
                <span className="text-lg">{f.emoji}</span>
                <span className="flex-1 text-brand-600">{f.label}</span>
                <span className="font-bold text-brand-800">{f.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {categoryStats.length > 0 && (
        <div className="card">
          <p className="mb-2 text-sm font-bold text-brand-700">Adesão por categoria</p>
          <div className="flex flex-col gap-1.5">
            {categoryStats.map((c) => (
              <div key={c.category} className="flex items-center gap-2 text-sm">
                <span className="flex-1 text-brand-600">{CATEGORY_LABELS[c.category as keyof typeof CATEGORY_LABELS]}</span>
                <div className="h-2 flex-1 rounded-full bg-brand-50">
                  <div className="h-2 rounded-full bg-brand-500" style={{ width: `${c.rate}%` }} />
                </div>
                <span className="w-9 text-right font-bold text-brand-800">{c.rate}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card items-center text-center">
      <p className="text-lg font-extrabold text-brand-900">{value}</p>
      <p className="text-[11px] text-brand-400">{label}</p>
    </div>
  );
}
