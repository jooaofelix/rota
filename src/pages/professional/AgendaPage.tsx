import { useEffect, useMemo, useState } from "react";
import { addDays } from "date-fns";
import clsx from "clsx";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToSessionsInRange, updateSession } from "@/services/sessions";
import { useSessionDrag } from "@/hooks/useSessionDrag";
import { useToast } from "@/contexts/ToastContext";
import type { SessionDoc } from "@/types";
import { TopBar } from "@/components/common/TopBar";
import { SessionEditorSheet } from "@/components/professional/SessionEditorSheet";
import { SessionActionSheet } from "@/components/professional/SessionActionSheet";
import { RoomSchedule } from "@/components/professional/RoomSchedule";
import { RoomConflictDialog } from "@/components/professional/RoomConflictDialog";
import { subscribeToPartners, subscribeToRoomSlots } from "@/services/room";
import { checkRoom, hasOwnSchedule, ownWindows, type RoomCheck } from "@/utils/roomAvailability";
import type { RoomPartnerDoc, RoomSlotDoc } from "@/types";
import {
  HOUR_PX,
  blockGeometry,
  dayKey,
  dayLabel,
  hourRange,
  layoutDay,
  minutesOf,
  sessionColor,
  weekDays,
  weekLabel,
} from "@/utils/agenda";
import { todayKey } from "@/utils/date";

type Aba = "pacientes" | "sala";

export function AgendaPage() {
  const { firebaseUser, userDoc } = useAuth();
  const { showToast } = useToast();
  const [aba, setAba] = useState<Aba>("pacientes");
  const [reference, setReference] = useState(() => new Date());
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [editing, setEditing] = useState<SessionDoc | "new" | null>(null);
  const [active, setActive] = useState<SessionDoc | null>(null);
  const [partners, setPartners] = useState<RoomPartnerDoc[]>([]);
  const [roomSlots, setRoomSlots] = useState<RoomSlotDoc[]>([]);
  /** Arraste que caiu fora do turno dela e espera confirmação. */
  const [pendingDrop, setPendingDrop] = useState<
    { check: RoomCheck; sessionId: string; date: string; startTime: string; endTime: string } | null
  >(null);

  const days = useMemo(() => weekDays(reference), [reference]);
  const start = dayKey(days[0]);
  const end = dayKey(days[6]);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeToSessionsInRange(firebaseUser.uid, start, end, setSessions);
  }, [firebaseUser, start, end]);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeToPartners(firebaseUser.uid, setPartners);
  }, [firebaseUser]);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeToRoomSlots(firebaseUser.uid, setRoomSlots);
  }, [firebaseUser]);

  const mostraSala = hasOwnSchedule(roomSlots, partners);
  const hours = useMemo(() => hourRange(sessions), [sessions]);
  const firstHour = hours[0];
  const today = todayKey();

  const { preview, onPointerDown, onPointerMove, finish, consumeDrag } = useSessionDrag(
    firstHour,
    ({ sessionId, date, startTime, endTime }) => {
      const check = checkRoom(date, startTime, endTime, roomSlots, partners);
      if (check.status === "taken" || check.status === "free") {
        setPendingDrop({ check, sessionId, date, startTime, endTime });
        return;
      }
      applyDrop(sessionId, date, startTime, endTime);
    }
  );

  async function applyDrop(sessionId: string, date: string, startTime: string, endTime: string) {
    setPendingDrop(null);
    try {
      await updateSession(sessionId, { date, startTime, endTime });
      showToast("Sessão remarcada.");
    } catch {
      showToast("Não foi possível remarcar agora.", "error");
    }
  }

  return (
    <div>
      <TopBar
        title="Agenda"
        subtitle={aba === "pacientes" ? weekLabel(days) : "Escala fixa da semana"}
        action={
          aba === "pacientes" ? (
            <button
              onClick={() => setEditing("new")}
              className="rounded-full bg-brand-500 px-3 py-1.5 text-xs font-bold text-white"
            >
              + Sessão
            </button>
          ) : undefined
        }
      />

      <div className="mb-3 flex gap-2 px-4">
        {([["pacientes", "👥 Pacientes"], ["sala", "🚪 Uso da sala"]] as Array<[Aba, string]>).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setAba(key)}
            className={clsx(
              "flex-1 rounded-xl px-3 py-2 text-sm font-bold transition",
              aba === key ? "bg-brand-500 text-white" : "bg-white text-brand-500"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {aba === "sala" ? (
        firebaseUser && <RoomSchedule professionalId={firebaseUser.uid} ownerName={userDoc?.name ?? "Responsável"} />
      ) : (
      <>
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
                  data-day={key}
                  className={clsx("relative flex-1 border-l border-brand-100", key === today && "bg-brand-50/40")}
                  style={{ height: hours.length * HOUR_PX }}
                >
                  {hours.map((hour) => (
                    <div key={hour} style={{ height: HOUR_PX }} className="border-b border-dashed border-brand-100" />
                  ))}

                  {/* Só as faixas em que a sala é dela ficam limpas; o resto sai sombreado,
                      para a semana já mostrar onde ela pode atender. */}
                  {mostraSala && (
                    <div className="pointer-events-none absolute inset-0 bg-slate-500/[0.07]">
                      {ownWindows(day.getDay(), roomSlots, partners).map((w) => {
                        const g = blockGeometry(w, firstHour);
                        return (
                          <div
                            key={w.id}
                            className="absolute inset-x-0 bg-white"
                            style={{ top: g.top, height: g.height }}
                          />
                        );
                      })}
                    </div>
                  )}

                  {laid.map(({ item: session, lane, lanes }) => {
                    const { top, height } = blockGeometry(session, firstHour);
                    const color = sessionColor(session);
                    const off = session.status === "cancelled" || session.status === "no_show";
                    const arrastando = preview?.sessionId === session.id;
                    return (
                      <button
                        key={session.id}
                        onPointerDown={(e) => onPointerDown(e, session)}
                        onPointerMove={onPointerMove}
                        onPointerUp={() => finish(true)}
                        onPointerCancel={() => finish(false)}
                        onClick={() => {
                          if (consumeDrag()) return; // acabou de arrastar: não abre a folha
                          setActive(session);
                        }}
                        style={{
                          top,
                          height,
                          left: `${(lane / lanes) * 100}%`,
                          width: `${100 / lanes}%`,
                          backgroundColor: off ? "transparent" : color,
                          borderColor: color,
                          // Só trava a rolagem depois que o arraste arma; antes disso a
                          // grade precisa continuar rolando na horizontal normalmente.
                          touchAction: arrastando ? "none" : "manipulation",
                        }}
                        className={clsx(
                          "absolute overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-left",
                          off ? "border border-dashed opacity-70" : "text-white",
                          arrastando && "opacity-30"
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

                  {preview?.date === key && (
                    <div
                      className="pointer-events-none absolute rounded-md border-2 border-dashed border-brand-500 bg-brand-500/20 px-1.5 py-1"
                      style={{
                        top: ((minutesOf(preview.startTime) - firstHour * 60) / 60) * HOUR_PX,
                        height: Math.max(((minutesOf(preview.endTime) - minutesOf(preview.startTime)) / 60) * HOUR_PX, 26),
                        left: 0,
                        width: "100%",
                      }}
                    >
                      <p className="text-[11px] font-bold leading-tight text-brand-700">
                        {preview.startTime} - {preview.endTime}
                      </p>
                    </div>
                  )}
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

      {sessions.length > 0 && (
        <p className="px-4 pb-6 text-center text-xs text-brand-400">
          Segure um atendimento por um instante e arraste para mudar de dia ou horário.
          {mostraSala && " As faixas sombreadas são horários em que a sala não é sua."}
        </p>
      )}

      </>
      )}

      {pendingDrop && (
        <RoomConflictDialog
          check={pendingDrop.check}
          ownerName={userDoc?.name ?? "Responsável"}
          date={pendingDrop.date}
          startTime={pendingDrop.startTime}
          endTime={pendingDrop.endTime}
          onConfirm={() =>
            applyDrop(pendingDrop.sessionId, pendingDrop.date, pendingDrop.startTime, pendingDrop.endTime)
          }
          onCancel={() => setPendingDrop(null)}
        />
      )}

      {editing && firebaseUser && (
        <SessionEditorSheet
          professionalId={firebaseUser.uid}
          existing={editing === "new" ? undefined : editing}
          defaultDate={start}
          ownerName={userDoc?.name ?? "Responsável"}
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
