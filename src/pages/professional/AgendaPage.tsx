import { useEffect, useMemo, useRef, useState } from "react";
import { addDays } from "date-fns";
import clsx from "clsx";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToSessionsInRange, updateSession } from "@/services/sessions";
import { subscribeToPersonalEventsInRange } from "@/services/personalEvents";
import { useSessionDrag } from "@/hooks/useSessionDrag";
import { useToast } from "@/contexts/ToastContext";
import type { PersonalEventDoc, SessionDoc } from "@/types";
import { TopBar } from "@/components/common/TopBar";
import { SessionEditorSheet } from "@/components/professional/SessionEditorSheet";
import { SessionActionSheet } from "@/components/professional/SessionActionSheet";
import { RoomSchedule } from "@/components/professional/RoomSchedule";
import { DayAgenda } from "@/components/professional/DayAgenda";
import { PersonalEventSheet } from "@/components/professional/PersonalEventSheet";
import { CalendarSyncSheet } from "@/components/professional/CalendarSyncSheet";
import { AgendaImportSheet } from "@/components/professional/AgendaImportSheet";
import { subscribeToExternalEvents, type ExternalEventDoc } from "@/services/externalEvents";
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
import { PERSONAL_COLORS, PERSONAL_ICONS } from "@/utils/personal";

type Aba = "pacientes" | "dia" | "sala";

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
  const [events, setEvents] = useState<PersonalEventDoc[]>([]);
  const [editingEvent, setEditingEvent] = useState<PersonalEventDoc | "new" | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [importandoAgenda, setImportandoAgenda] = useState(false);
  const [doGoogle, setDoGoogle] = useState<ExternalEventDoc[]>([]);
  /** Dia mostrado na aba "Meu dia" — anda sozinho, sem mexer na semana. */
  const [diaFoco, setDiaFoco] = useState(() => todayKey());
  /** Arraste que caiu fora do turno dela e espera confirmação. */
  const [pendingDrop, setPendingDrop] = useState<
    { check: RoomCheck; sessionId: string; date: string; startTime: string; endTime: string } | null
  >(null);

  const days = useMemo(() => weekDays(reference), [reference]);
  const gradeRef = useRef<HTMLDivElement>(null);
  const start = dayKey(days[0]);
  const end = dayKey(days[6]);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeToSessionsInRange(firebaseUser.uid, start, end, setSessions);
  }, [firebaseUser, start, end]);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeToExternalEvents(firebaseUser.uid, start, end, setDoGoogle);
  }, [firebaseUser, start, end]);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeToPartners(firebaseUser.uid, setPartners);
  }, [firebaseUser]);

  // A aba do dia pode estar fora da semana exibida, então a busca cobre as duas
  // pontas em vez de só a semana.
  useEffect(() => {
    if (!firebaseUser) return;
    const de = diaFoco < start ? diaFoco : start;
    const ate = diaFoco > end ? diaFoco : end;
    return subscribeToPersonalEventsInRange(firebaseUser.uid, de, ate, setEvents);
  }, [firebaseUser, start, end, diaFoco]);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeToRoomSlots(firebaseUser.uid, setRoomSlots);
  }, [firebaseUser]);

  const mostraSala = hasOwnSchedule(roomSlots, partners);
  const comHora = useMemo(
    () => events.filter((e): e is PersonalEventDoc & { startTime: string; endTime: string } => !!e.startTime && !!e.endTime),
    [events]
  );
  const hours = useMemo(() => hourRange([...sessions, ...comHora]), [sessions, comHora]);
  const firstHour = hours[0];
  const today = todayKey();

  /**
   * No celular só cabem ~3 colunas, e a semana começa na segunda: abrindo a
   * agenda numa sexta, o dia de hoje ficava fora da tela e a impressão era de
   * agenda vazia. Traz a coluna de hoje para o centro assim que a grade monta.
   */
  useEffect(() => {
    const grade = gradeRef.current;
    if (!grade) return;
    const coluna = grade.querySelector<HTMLElement>(`[data-day="${today}"]`);
    if (!coluna) return;
    const alvo = coluna.offsetLeft - (grade.clientWidth - coluna.clientWidth) / 2;
    grade.scrollTo({ left: Math.max(0, alvo), behavior: "auto" });
  }, [today, start, aba, hours.length]);

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
        subtitle={
          aba === "pacientes"
            ? weekLabel(days)
            : aba === "dia"
              ? "Atendimentos e compromissos"
              : "Escala fixa da semana"
        }
        action={
          aba === "pacientes" ? (
            <div className="flex gap-1.5">
              <button
                onClick={() => setSincronizando(true)}
                title="Levar para o Google Agenda"
                className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-600"
              >
                📅 Sincronizar
              </button>
              <button
                onClick={() => setEditing("new")}
                className="rounded-full bg-brand-500 px-3 py-1.5 text-xs font-bold text-white"
              >
                + Sessão
              </button>
            </div>
          ) : aba === "dia" ? (
            <button
              onClick={() => setEditingEvent("new")}
              className="rounded-full bg-brand-500 px-3 py-1.5 text-xs font-bold text-white"
            >
              + Pessoal
            </button>
          ) : undefined
        }
      />

      <div className="mb-3 flex gap-2 px-4">
        {(
          [
            ["pacientes", "👥 Semana"],
            ["dia", "📋 Meu dia"],
            ["sala", "🚪 Sala"],
          ] as Array<[Aba, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setAba(key)}
            className={clsx(
              "flex-1 rounded-xl px-2 py-2 text-sm font-bold transition",
              aba === key ? "bg-brand-500 text-white" : "bg-white text-brand-500"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {aba === "sala" ? (
        firebaseUser && <RoomSchedule professionalId={firebaseUser.uid} ownerName={userDoc?.name ?? "Responsável"} />
      ) : aba === "dia" ? (
        <DayAgenda
          date={diaFoco}
          sessions={sessions}
          events={events}
          onPrev={() => setDiaFoco(dayKey(addDays(new Date(`${diaFoco}T12:00:00`), -1)))}
          onNext={() => setDiaFoco(dayKey(addDays(new Date(`${diaFoco}T12:00:00`), 1)))}
          onToday={() => setDiaFoco(todayKey())}
          onOpenSession={setActive}
          onOpenEvent={setEditingEvent}
          onNewEvent={() => setEditingEvent("new")}
        />
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
      <div ref={gradeRef} data-hscroll className="overflow-x-auto pb-4">
        <div className="min-w-[680px] px-4">
          <div className="flex">
            <div className="sticky left-0 z-20 w-11 shrink-0 bg-cream-50" />
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
                  <p className={clsx("text-[11px] font-bold uppercase", key === today ? "text-brand-600" : "text-brand-400")}>
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
            {/* Fica presa à esquerda: rolando a semana no celular, o horário
                continua à vista em vez de sair junto com os dias. */}
            <div className="sticky left-0 z-20 w-11 shrink-0 bg-cream-50">
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

                  {/* O que veio do Google: cinza, atrás de tudo e sem clique. É
                      cópia — mexer aqui daria a ilusão de ter mudado alguma coisa
                      lá. Serve para ela não marcar paciente em cima. */}
                  {doGoogle
                    .filter((e) => e.date === key && e.startTime && e.endTime)
                    .map((e) => {
                      const g = blockGeometry(e, firstHour);
                      return (
                        <div
                          key={e.id}
                          title={`${e.titulo} (Google Agenda)`}
                          style={{ top: g.top, height: g.height }}
                          className="pointer-events-none absolute inset-x-0 overflow-hidden rounded-md border-l-4 border-slate-300 bg-slate-400/15 px-1.5 py-1"
                        >
                          <p className="truncate text-[11px] font-bold leading-tight text-slate-500">
                            {e.titulo}
                          </p>
                        </div>
                      );
                    })}

                  {/* Compromisso pessoal desenhado antes do atendimento e em faixa
                      listrada: ocupa o horário de verdade, mas o atendimento é o que
                      ela procura quando bate o olho na semana. */}
                  {comHora
                    .filter((e) => e.date === key)
                    .map((e) => {
                      const g = blockGeometry(e, firstHour);
                      return (
                        <button
                          key={e.id}
                          onClick={() => setEditingEvent(e)}
                          style={{
                            top: g.top,
                            height: g.height,
                            borderColor: PERSONAL_COLORS[e.kind],
                            backgroundColor: `${PERSONAL_COLORS[e.kind]}22`,
                          }}
                          className="absolute inset-x-0 overflow-hidden rounded-md border-l-4 border-dashed px-1.5 py-1 text-left"
                        >
                          <p className="pointer-events-none truncate text-[11px] font-bold leading-tight text-brand-700">
                            {PERSONAL_ICONS[e.kind]} {e.title}
                          </p>
                        </button>
                      );
                    })}

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
                          // A rolagem é barrada pelo listener de touchmove, não por
                          // touch-action: o navegador congela esse valor no início do
                          // gesto, então trocá-lo depois não teria efeito nenhum.
                          touchAction: "manipulation",
                          WebkitTouchCallout: "none",
                          userSelect: "none",
                        }}
                        className={clsx(
                          "absolute overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-left",
                          off ? "border border-dashed opacity-70" : "text-white",
                          arrastando && "opacity-30"
                        )}
                      >
                        {/* pointer-events-none nos filhos: o alvo do toque precisa ser o
                            próprio bloco, senão o touch-action dele não vale e o
                            navegador trata o gesto como rolagem. */}
                        <p
                          className={clsx(
                            "pointer-events-none truncate text-[11px] font-bold leading-tight",
                            off && "text-brand-500 line-through"
                          )}
                        >
                          {session.patientName}
                        </p>
                        {height > 34 && (
                          <p
                            className={clsx(
                              "pointer-events-none truncate text-[10px] leading-tight",
                              off ? "text-brand-400" : "opacity-90"
                            )}
                          >
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
          professionalId={firebaseUser?.uid ?? ""}
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

      {sincronizando && firebaseUser && (
        <CalendarSyncSheet
          professionalId={firebaseUser.uid}
          sessoes={sessions}
          pessoais={events}
          onImportar={() => {
            setSincronizando(false);
            setImportandoAgenda(true);
          }}
          onClose={() => setSincronizando(false)}
        />
      )}

      {importandoAgenda && firebaseUser && (
        <AgendaImportSheet professionalId={firebaseUser.uid} onClose={() => setImportandoAgenda(false)} />
      )}

      {editingEvent && firebaseUser && (
        <PersonalEventSheet
          professionalId={firebaseUser.uid}
          existing={editingEvent === "new" ? undefined : editingEvent}
          defaultDate={aba === "dia" ? diaFoco : today}
          onClose={() => setEditingEvent(null)}
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
