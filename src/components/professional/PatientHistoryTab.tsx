import { useEffect, useMemo, useState } from "react";
import { subscribeToPatientHistory } from "@/services/completions";
import { subscribeToRoutineItems } from "@/services/routines";
import type { CompletionDoc, RoutineItemDoc } from "@/types";
import { EmptyState } from "@/components/common/EmptyState";
import { FEELING_OPTIONS, SKIP_REASON_OPTIONS } from "@/utils/constants";
import { formatShortDate } from "@/utils/date";

export function PatientHistoryTab({ patientId }: { patientId: string }) {
  const [history, setHistory] = useState<CompletionDoc[]>([]);
  const [items, setItems] = useState<RoutineItemDoc[]>([]);

  useEffect(() => {
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

  if (grouped.length === 0) {
    return <EmptyState icon="📅" title="Ainda não há histórico" description="Assim que o paciente registrar atividades, elas aparecem aqui." />;
  }

  return (
    <div className="flex flex-col gap-4">
      {grouped.map(([date, completions]) => (
        <div key={date}>
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
                    <span className="text-xs font-bold text-brand-400">
                      {c.status === "completed" ? "Concluída" : c.status === "partial" ? "Parcial" : "Não realizada"}
                    </span>
                  </div>
                  {feelingOption && (
                    <p className="mt-1 text-xs text-brand-500">
                      {feelingOption.emoji} {feelingOption.label} {c.neededHelp && "· precisou de ajuda"}
                    </p>
                  )}
                  {skipOption && <p className="mt-1 text-xs text-brand-500">{skipOption.emoji} {skipOption.label}</p>}
                  {c.comment && <p className="mt-1 text-xs italic text-brand-500">"{c.comment}"</p>}
                  {c.skipReasonOther && <p className="mt-1 text-xs italic text-brand-500">"{c.skipReasonOther}"</p>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
