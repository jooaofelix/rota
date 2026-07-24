import clsx from "clsx";
import type { RoutineItemDoc } from "@/types";
import type { TodayStatus } from "@/utils/schedule";
import { CATEGORY_LABELS } from "@/utils/constants";

interface ActivityCardProps {
  item: RoutineItemDoc;
  status: TodayStatus;
  onOpen: () => void;
}

const STATUS_STYLES: Record<TodayStatus, string> = {
  pending: "border-brand-100",
  late: "border-amber-300 bg-amber-50/60",
  completed: "border-brand-200 bg-brand-50/60 opacity-80",
  partial: "border-sky-200 bg-sky-50/60 opacity-90",
  skipped: "border-brand-100 opacity-60",
};

export function ActivityCard({ item, status, onOpen }: ActivityCardProps) {
  const isDone = status === "completed" || status === "partial" || status === "skipped";

  return (
    <button
      onClick={onOpen}
      className={clsx(
        "flex w-full items-center gap-3 rounded-2xl border-2 bg-white p-3 text-left shadow-sm transition active:scale-[0.98]",
        STATUS_STYLES[status]
      )}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-2xl">
        {item.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className={clsx("truncate text-sm font-bold text-brand-900", isDone && "line-through decoration-brand-300")}>
          {item.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-brand-400">
          {item.time && <span>{item.time}</span>}
          <span>·</span>
          <span>{CATEGORY_LABELS[item.category]}</span>
          {item.priority === "high" && <span className="font-bold text-rose-400">· prioridade alta</span>}
        </div>
      </div>
      <StatusPill status={status} />
    </button>
  );
}

function StatusPill({ status }: { status: TodayStatus }) {
  if (status === "completed") return <span className="text-2xl">✅</span>;
  if (status === "partial") return <span className="text-2xl">🔵</span>;
  if (status === "skipped") return <span className="text-2xl">⏸️</span>;
  if (status === "late") return <span className="text-2xl">⏰</span>;
  return <span className="h-6 w-6 shrink-0 rounded-full border-2 border-brand-200" />;
}
