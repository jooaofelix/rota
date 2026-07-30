import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { subscribeToUpcomingSessions } from "@/services/sessions";
import type { SessionDoc } from "@/types";
import { PAYMENT_LABELS, PAYMENT_STYLES, sessionColor } from "@/utils/agenda";
import { formatShortDate, isDateKeyToday } from "@/utils/date";
import { SessionActionSheet } from "./SessionActionSheet";

/** "13:00" -> "13h00", como aparece nas agendas de consultório. */
function hourLabel(time: string) {
  return time.replace(":", "h");
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * As próximas sessões, agrupadas por dia. É o cartão que responde "o que vem
 * agora" sem obrigar a abrir a agenda inteira.
 */
export function UpcomingSessions({ professionalId, max = 8 }: { professionalId: string; max?: number }) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [active, setActive] = useState<SessionDoc | null>(null);

  useEffect(() => subscribeToUpcomingSessions(professionalId, setSessions), [professionalId]);

  const grouped = useMemo(() => {
    const days = new Map<string, SessionDoc[]>();
    sessions.slice(0, max).forEach((s) => {
      days.set(s.date, [...(days.get(s.date) ?? []), s]);
    });
    return Array.from(days.entries());
  }, [sessions, max]);

  return (
    <div className="card">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-bold text-brand-700">📅 Próximas sessões</p>
        <button onClick={() => navigate("/agenda")} className="text-xs font-bold text-brand-500">
          Ver agenda
        </button>
      </div>

      {grouped.length === 0 ? (
        <p className="py-4 text-center text-sm text-brand-400">Nenhuma sessão agendada daqui para frente.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {grouped.map(([date, items]) => (
            <div key={date}>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-brand-300">
                {isDateKeyToday(date) ? "Hoje" : formatShortDate(date)}
              </p>
              <div className="flex flex-col">
                {items.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActive(s)}
                    className="flex items-center gap-3 border-b border-brand-50 py-2.5 text-left last:border-b-0"
                  >
                    <span className="w-12 shrink-0 text-sm font-bold text-brand-700">{hourLabel(s.startTime)}</span>
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: sessionColor(s) }}
                    >
                      {initials(s.patientName)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-brand-800">{s.patientName}</span>
                      <span className="block text-xs text-brand-400">
                        {s.modality === "online" ? "🎥 Online" : "Presencial"}
                        {s.status === "no_show" && " · faltou"}
                      </span>
                    </span>
                    <span
                      className={clsx(
                        "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
                        PAYMENT_STYLES[s.paymentStatus]
                      )}
                    >
                      {PAYMENT_LABELS[s.paymentStatus]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {active && (
        <SessionActionSheet
          session={active}
          onClose={() => setActive(null)}
          onEdit={() => {
            setActive(null);
            navigate("/agenda");
          }}
        />
      )}
    </div>
  );
}
