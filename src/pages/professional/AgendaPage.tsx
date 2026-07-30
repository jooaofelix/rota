import { useEffect, useMemo, useState } from "react";
import { addDays } from "date-fns";
import clsx from "clsx";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToSessionsInRange } from "@/services/sessions";
import type { SessionDoc } from "@/types";
import { TopBar } from "@/components/common/TopBar";
import { SessionEditorSheet } from "@/components/professional/SessionEditorSheet";
import { SessionActionSheet } from "@/components/professional/SessionActionSheet";
import {
  HOUR_PX,
  blockGeometry,
  dayKey,
  dayLabel,
  hourRange,
  layoutDay,
  sessionColor,
  weekDays,
  weekLabel,
} from "@/utils/agenda";
import { todayKey } from "@/utils/date";

export function AgendaPage() {
  const { firebaseUser } = useAuth();
  const [reference, setReference] = useState(() => new Date());
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [editing, setEditing] = useState<SessionDoc | "new" | null>(null);
  const [active, setActive] = useState<SessionDoc | null>(null);

  const days = useMemo(() => weekDays(reference), [reference]);
  const start = dayKey(days[0]);
  const end = dayKey(days[6]);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeToSessionsInRange(firebaseUser.uid, start, end, setSessions);
  }, [firebaseUser, start, end]);

  const hours = useMemo(() => hourRange(sessions), [sessions]);
  const firstHour = hours[0];
  const today = todayKey();

  return (
    <div>
      <TopBar
        title="Agenda"
        subtitle={weekLabel(days)}
        action={
          <button
            onClick={() => setEditing("new")}
            className="rounded-full bg-brand-500 px-3 py-1.5 text-xs font-bold text-white"
          >
            + Sessão
          </button>
        }
      />

      <div className="mb-2 flex items-center justify-center gap-2 px-4">
        <NavButton label="‹" onClick={() => setReference(addDays(reference, -7))} />
        <button
          onClick={() => setReference(new Date())}
          className="rounded-full bg-white px-4 py-1.5 text-xs font-bold text-brand-600 shadow-sm"
        >
          Hoje
        </button>
        <NavButton label="›" onClick={() => setReference(addDays(reference, 7))} />
      </div>

      {/* A grade rola na horizontal no celular: sete colunas legíveis não cabem em 390px. */}
      <div className="overflow-x-auto pb-4">
        <div className="min-w-[680px] px-4">
          <div className="flex">
            <div className="w-11 shrink-0" />
            {days.map((day) => {
              const key = dayKey(day);
              const { weekday, day: dayNumber } = dayLabel(day);
              return (
                <div
                  key={key}
                  className={clsx(
                    "flex-1 border-b-2 pb-1.5 text-center",
                    key === today ? "border-brand-500" : "border-transparent"
                  )}
                >
                  <p className={clsx("text-[11px] font-bold uppercase", key === today ? "text-brand-600" : "text-brand-300")}>
                    {weekday}
                  </p>
                  <p className={clsx("text-xs font-bold", key === today ? "text-brand-700" : "text-brand-500")}>
                    {dayNumber}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="relative flex">
            <div className="w-11 shrink-0">
              {hours.map((hour) => (
                <div key={hour} style={{ height: HOUR_PX }} className="relative">
                  <span className="absolute -top-1.5 right-1.5 text-[10px] font-bold text-brand-300">
                    {String(hour).padStart(2, "0")}:00
                  </span>
                </div>
              ))}
            </div>

            {days.map((day) => {
              const key = dayKey(day);
              const laid = layoutDay(sessions.filter((s) => s.date === key));
              return (
                <div
                  key={key}
                  className={clsx("relative flex-1 border-l border-brand-100", key === today && "bg-brand-50/40")}
                  style={{ height: hours.length * HOUR_PX }}
                >
                  {hours.map((hour) => (
                    <div key={hour} style={{ height: HOUR_PX }} className="border-b border-dashed border-brand-100" />
                  ))}

                  {laid.map(({ session, lane, lanes }) => {
                    const { top, height } = blockGeometry(session, firstHour);
                    const color = sessionColor(session);
                    const off = session.status === "cancelled" || session.status === "no_show";
                    return (
                      <button
                        key={session.id}
                        onClick={() => setActive(session)}
                        style={{
                          top,
                          height,
                          left: `${(lane / lanes) * 100}%`,
                          width: `${100 / lanes}%`,
                          backgroundColor: off ? "transparent" : color,
                          borderColor: color,
                        }}
                        className={clsx(
                          "absolute overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-left",
                          off ? "border border-dashed opacity-70" : "text-white"
                        )}
                      >
                        <p
                          className={clsx(
                            "truncate text-[11px] font-bold leading-tight",
                            off && "text-brand-500 line-through"
                          )}
                        >
                          {session.patientName}
                        </p>
                        {height > 34 && (
                          <p className={clsx("truncate text-[10px] leading-tight", off ? "text-brand-400" : "opacity-90")}>
                            {session.startTime} - {session.endTime}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {sessions.length === 0 && (
        <p className="px-4 pb-6 text-center text-sm text-brand-400">
          Nenhum atendimento nesta semana. Toque em <span className="font-bold">+ Sessão</span> para agendar.
        </p>
      )}

      {editing && firebaseUser && (
        <SessionEditorSheet
          professionalId={firebaseUser.uid}
          existing={editing === "new" ? undefined : editing}
          defaultDate={start}
          onClose={() => setEditing(null)}
        />
      )}

      {active && (
        <SessionActionSheet
          session={active}
          onClose={() => setActive(null)}
          onEdit={() => {
            setEditing(active);
            setActive(null);
          }}
        />
      )}
    </div>
  );
}

function NavButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-bold text-brand-500 shadow-sm"
    >
      {label}
    </button>
  );
}
