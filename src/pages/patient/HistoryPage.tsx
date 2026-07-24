import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToPatientHistory } from "@/services/completions";
import { subscribeToRoutineItems } from "@/services/routines";
import type { CompletionDoc, RoutineItemDoc } from "@/types";
import { TopBar } from "@/components/common/TopBar";
import { EmptyState } from "@/components/common/EmptyState";
import { FEELING_OPTIONS, SKIP_REASON_OPTIONS } from "@/utils/constants";
import { formatShortDate } from "@/utils/date";

export function HistoryPage() {
  const { firebaseUser } = useAuth();
  const patientId = firebaseUser?.uid;
  const [history, setHistory] = useState<CompletionDoc[]>([]);
  const [items, setItems] = useState<RoutineItemDoc[]>([]);

  useEffect(() => {
    if (!patientId) return;
    const unsub = [subscribeToPatientHistory(patientId, setHistory), subscribeToRoutineItems(patientId, setItems)];
    return () => unsub.forEach((u) => u());
  }, [patientId]);

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const grouped = useMemo(() => {
    const map = new Map<string, CompletionDoc[]>();
    history.forEach((c) => {
      const list = map.get(c.date) ?? [];
      list.push(c);
      map.set(c.date, list);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [history]);

  return (
    <div>
      <TopBar title="Histórico" subtitle="Tudo o que você já registrou" />
      <div className="px-4 pb-4">
        {grouped.length === 0 ? (
          <EmptyState icon="📅" title="Ainda não há histórico" description="Conforme você concluir atividades, elas aparecem aqui." />
        ) : (
          grouped.map(([date, completions]) => (
            <div key={date} className="mb-4">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-brand-300">{formatShortDate(date)}</p>
              <div className="flex flex-col gap-2">
                {completions.map((c) => {
                  const item = itemById.get(c.routineItemId);
                  const feelingOption = c.feeling ? FEELING_OPTIONS.find((f) => f.key === c.feeling) : null;
                  const skipOption = c.skipReason ? SKIP_REASON_OPTIONS.find((s) => s.key === c.skipReason) : null;
                  return (
                    <div key={c.id} className="card">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{item?.icon ?? "⭐"}</span>
                        <p className="flex-1 truncate text-sm font-bold text-brand-800">{item?.title ?? "Atividade"}</p>
                        {feelingOption && <span className="text-xl">{feelingOption.emoji}</span>}
                        {skipOption && <span className="text-xl">{skipOption.emoji}</span>}
                      </div>
                      {c.comment && <p className="mt-1 text-xs italic text-brand-500">"{c.comment}"</p>}
                      {c.skipReasonOther && <p className="mt-1 text-xs italic text-brand-500">"{c.skipReasonOther}"</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
