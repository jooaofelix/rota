import { useEffect, useMemo, useRef, useState } from "react";
import { addDays } from "date-fns";
import clsx from "clsx";
import { useAuth } from "@/contexts/AuthContext";
import { setPaymentStatus, subscribeToSessionsInRange, updateSession } from "@/services/sessions";
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
import { GoogleBlockSheet } from "@/components/professional/GoogleBlockSheet";
import { AgendaImportSheet } from "@/components/professional/AgendaImportSheet";
import { DuplicatesSheet } from "@/components/professional/DuplicatesSheet";
import { NovoBlocoSheet } from "@/components/professional/NovoBlocoSheet";
import { subscribeToExternalEvents, type ExternalEventDoc } from "@/services/externalEvents";
import { RoomConflictDialog } from "@/components/professional/RoomConflictDialog";
import { subscribeToPartners, subscribeToRoomSlots } from "@/services/room";
import { checkRoom, hasOwnSchedule, ownWindows, type RoomCheck } from "@/utils/roomAvailability";
import type { RoomPartnerDoc, RoomSlotDoc } from "@/types";
import {
  CORES_DA_MARCA,
  HOUR_PX,
  blockGeometry,
  dayKey,
  dayLabel,
  horaDe,
  hourRange,
  layoutDay,
  marcasDaSessao,
  minutesOf,
  proximaMarca,
  sessionColor,
  weekDays,
  weekLabel,
  type MarcaDaSessao,
} from "@/utils/agenda";
import { ecoDoGoogle } from "@/utils/conflitos";
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
  const [verificando, setVerificando] = useState(false);
  const [doGoogle, setDoGoogle] = useState<ExternalEventDoc[]>([]);
  const [erroGoogle, setErroGoogle] = useState<{ mensagem: string; link?: string } | null>(null);
  const [blocoGoogle, setBlocoGoogle] = useState<ExternalEventDoc | null>(null);
  const [novaDe, setNovaDe] = useState<{ date: string; inicio: string; fim: string } | null>(null);
  /** Horário vazio que ela tocou na grade, esperando virar atendimento ou pessoal. */
  const [novoEm, setNovoEm] = useState<{ date: string; inicio: string; fim: string } | null>(null);
  /** O mesmo horário, já encaminhado para o lado pessoal. */
  const [novoPessoalEm, setNovoPessoalEm] = useState<{ date: string; inicio: string; fim: string } | null>(
    null
  );
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
    return subscribeToExternalEvents(
      firebaseUser.uid,
      start,
      end,
      (itens) => {
        setDoGoogle(itens);
        setErroGoogle(null);
      },
      setErroGoogle
    );
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

  /**
   * Toque numa marca do bloco: responde a pergunta sem abrir nada.
   *
   * Grava direto, sem confirmar, porque tudo aqui se desfaz com outro toque — e
   * pedir confirmação para marcar "pago" vinte vezes por dia seria pior que
   * errar uma. O aviso diz de quem e o quê, para o toque errado ser visível.
   */
  async function alternarMarca(session: SessionDoc, chave: MarcaDaSessao["chave"]) {
    const { patch, aviso } = proximaMarca(session, chave);
    try {
      if (patch.paymentStatus) await setPaymentStatus(session.id, patch.paymentStatus);
      else await updateSession(session.id, patch);
      showToast(`${session.patientName}: ${aviso.toLowerCase()}.`);
    } catch {
      showToast("Não deu para atualizar agora.", "error");
    }
  }

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
    <div className="agenda-larga">
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

      {/* O espelho do Google falhando em silêncio custou uma tarde: dizia "218
          compromissos espelhados" e a grade continuava vazia. Agora o motivo
          aparece aqui, com o comando que resolve. */}
      {erroGoogle && (
        <div className="mx-4 mb-3 rounded-xl bg-amber-50 p-2.5 text-[11px] leading-snug text-amber-800">
          <p>⚠️ {erroGoogle.mensagem}</p>
          {erroGoogle.link && (
            <a
              href={erroGoogle.link}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 inline-block rounded-lg bg-amber-200/70 px-2.5 py-1 font-bold text-amber-900"
            >
              Criar o índice no Firebase →
            </a>
          )}
        </div>
      )}

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
                  onClick={(e) => {
                    // Só o vazio conta. Um clique num atendimento, num bloco do
                    // Google ou num compromisso pessoal cai naquele bloco, não
                    // aqui — e o teste é o alvo, não a posição, porque depois de
                    // arrastar o clique ainda pertence ao bloco arrastado.
                    const alvo = e.target as HTMLElement;
                    if (alvo !== e.currentTarget && alvo.dataset.hora === undefined) return;

                    const rect = e.currentTarget.getBoundingClientRect();
                    const bruto = firstHour * 60 + ((e.clientY - rect.top) / HOUR_PX) * 60;
                    // Para baixo, não para o mais perto: tocar às 9h20 e receber
                    // 9h30 tira o horário do lugar onde o dedo pousou.
                    const inicio = Math.max(0, Math.floor(bruto / 30) * 30);
                    setNovoEm({ date: key, inicio: horaDe(inicio), fim: horaDe(inicio + 50) });
                  }}
                  className={clsx("relative flex-1 border-l border-brand-100", key === today && "bg-brand-50/40")}
                  style={{ height: hours.length * HOUR_PX }}
                >
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      data-hora={hour}
                      style={{ height: HOUR_PX }}
                      className="border-b border-dashed border-brand-100"
                    />
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

                  {/* O que veio do Google: cinza e atrás do atendimento, mas
                      lado a lado quando dois se sobrepõem — dois compromissos
                      empilhados escondiam um ao outro. Clicar abre; arrastar não,
                      porque quem manda neles é o Google. */}
                  {/* O bloco some quando já existe atendimento no mesmo horário:
                      depois de converter, ver os dois lado a lado pareceria
                      agenda dobrada — e o Google continua mandando o mesmo
                      compromisso a cada leitura. */}
                  {layoutDay(
                    doGoogle.filter(
                      (e) => e.date === key && e.startTime && e.endTime && !ecoDoGoogle(e, sessions)
                    )
                  ).map(
                    ({ item: e, lane, lanes }) => {
                      const g = blockGeometry(e, firstHour);
                      return (
                        <button
                          key={e.id}
                          onClick={() => setBlocoGoogle(e)}
                          title={`${e.titulo} (Google Agenda)`}
                          style={{
                            top: g.top,
                            height: g.height,
                            left: `${(lane / lanes) * 100}%`,
                            width: `${100 / lanes}%`,
                          }}
                          className="absolute overflow-hidden rounded-md border-l-4 border-slate-300 bg-slate-400/15 px-1.5 py-1 text-left"
                        >
                          <p className="truncate text-[11px] font-bold leading-tight text-slate-500">
                            {e.titulo}
                          </p>
                        </button>
                      );
                    }
                  )}

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
                    // Abaixo disto não cabem duas linhas — nome e marcas dividem uma.
                    const curto = height < 40;
                    const arrastando = preview?.sessionId === session.id;
                    return (
                      // div em vez de button: as marcas de presença, pagamento e
                      // modalidade são botões de verdade agora, e botão dentro de
                      // botão não existe em HTML.
                      <div
                        key={session.id}
                        role="button"
                        tabIndex={0}
                        onPointerDown={(e) => onPointerDown(e, session)}
                        onPointerMove={onPointerMove}
                        onPointerUp={() => finish(true)}
                        onPointerCancel={() => finish(false)}
                        onClick={() => {
                          if (consumeDrag()) return; // acabou de arrastar: não abre a folha
                          setActive(session);
                        }}
                        // Um <button> trazia isto de graça; o div precisa devolver,
                        // e no computador o teclado é caminho de uso, não exceção.
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== " ") return;
                          e.preventDefault();
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
                          "absolute overflow-hidden rounded-md border-l-4 text-left",
                          // No bloco curto cada pixel é disputado entre o nome e as
                          // marcas; a folga da margem é o que sobra para cortar.
                          curto ? "px-1 py-0.5" : "px-1.5 py-1",
                          off ? "border border-dashed opacity-70" : "text-white",
                          arrastando && "opacity-30"
                        )}
                      >
                        {/* Três alturas, três arranjos. O bloco de 50 minutos cabe
                            nome, horário e marcas em linhas separadas; o de meia
                            hora perde o horário; e o mais curto de todos põe as
                            marcas ao lado do nome, encolhidas. Sumir era a única
                            saída que não servia — atendimento curto também precisa
                            ser marcado como presente. */}
                        {curto ? (
                          <div className="flex items-center gap-1">
                            <p
                              className={clsx(
                                "pointer-events-none min-w-0 flex-1 truncate text-[10px] font-bold leading-tight",
                                off && "text-brand-500 line-through"
                              )}
                            >
                              {session.patientName}
                            </p>
                            <Marcas session={session} compacto onAlternar={alternarMarca} />
                          </div>
                        ) : (
                          <>
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
                            {height > 56 && (
                              <p
                                className={clsx(
                                  "pointer-events-none truncate text-[10px] leading-tight",
                                  off ? "text-brand-400" : "opacity-90"
                                )}
                              >
                                {session.startTime} - {session.endTime}
                              </p>
                            )}
                            <Marcas session={session} onAlternar={alternarMarca} />
                          </>
                        )}
                      </div>
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
        <p className="px-4 text-center text-xs text-brand-400">
          Segure um atendimento por um instante e arraste para mudar de dia ou horário.
          {mostraSala && " As faixas sombreadas são horários em que a sala não é sua."}
        </p>
      )}

      {/* Fica no rodapé da semana, e não no cabeçalho, porque é faxina: procurada
          quando ela desconfia que algo entrou duas vezes, não todo dia. */}
      <div className="px-4 pb-6 pt-3 text-center">
        <button
          onClick={() => setVerificando(true)}
          className="rounded-full bg-white px-4 py-2 text-xs font-bold text-brand-500 shadow-sm"
        >
          🔎 Verificar duplicidade
        </button>
      </div>

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

      {blocoGoogle && (
        <GoogleBlockSheet
          evento={blocoGoogle}
          onVirarSessao={() => {
            setNovaDe({ date: blocoGoogle.date, inicio: blocoGoogle.startTime, fim: blocoGoogle.endTime });
            setBlocoGoogle(null);
            setEditing("new");
          }}
          onClose={() => setBlocoGoogle(null)}
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
          onVerificarDuplicidade={() => {
            setSincronizando(false);
            setVerificando(true);
          }}
          onClose={() => setSincronizando(false)}
        />
      )}

      {importandoAgenda && firebaseUser && (
        <AgendaImportSheet
          professionalId={firebaseUser.uid}
          onVerificarDuplicidade={() => {
            setImportandoAgenda(false);
            setVerificando(true);
          }}
          onClose={() => setImportandoAgenda(false)}
        />
      )}

      {verificando && firebaseUser && (
        <DuplicatesSheet professionalId={firebaseUser.uid} onClose={() => setVerificando(false)} />
      )}

      {novoEm && (
        <NovoBlocoSheet
          data={novoEm.date}
          inicio={novoEm.inicio}
          fim={novoEm.fim}
          onAtendimento={() => {
            setNovaDe(novoEm);
            setNovoEm(null);
            setEditing("new");
          }}
          onPessoal={() => {
            setNovoPessoalEm(novoEm);
            setNovoEm(null);
            setEditingEvent("new");
          }}
          onClose={() => setNovoEm(null)}
        />
      )}

      {editingEvent && firebaseUser && (
        <PersonalEventSheet
          professionalId={firebaseUser.uid}
          existing={editingEvent === "new" ? undefined : editingEvent}
          defaultDate={novoPessoalEm?.date ?? (aba === "dia" ? diaFoco : today)}
          defaultStart={novoPessoalEm?.inicio}
          defaultEnd={novoPessoalEm?.fim}
          onClose={() => {
            setEditingEvent(null);
            setNovoPessoalEm(null);
          }}
        />
      )}

      {editing && firebaseUser && (
        <SessionEditorSheet
          professionalId={firebaseUser.uid}
          existing={editing === "new" ? undefined : editing}
          defaultDate={novaDe?.date ?? start}
          defaultStart={novaDe?.inicio}
          defaultEnd={novaDe?.fim}
          ownerName={userDoc?.name ?? "Responsável"}
          onClose={() => {
            setEditing(null);
            setNovaDe(null);
          }}
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

/**
 * As três marcas do bloco, cada uma um botão que responde a pergunta num toque.
 *
 * O stopPropagation no pointerdown impede que o toque arme o arraste do bloco —
 * sem isso, segurar o dedo no cifrão começaria a mover o atendimento em vez de
 * marcá-lo como pago.
 *
 * A versão compacta existe para o atendimento curto, onde as marcas dividem a
 * linha com o nome. Ela encolhe o alvo de toque, e isso é uma perda real; some
 * seria pior, porque atendimento de meia hora também precisa ser marcado.
 */
function Marcas({
  session,
  compacto,
  onAlternar,
}: {
  session: SessionDoc;
  compacto?: boolean;
  onAlternar: (session: SessionDoc, chave: MarcaDaSessao["chave"]) => void;
}) {
  return (
    <div className={clsx("flex shrink-0 items-center leading-none", compacto ? "gap-0" : "gap-0.5")}>
      {marcasDaSessao(session).map((m) => (
        <button
          key={m.chave}
          type="button"
          title={`${m.titulo} — toque para mudar`}
          aria-label={`${session.patientName}: ${m.titulo}. Toque para mudar.`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onAlternar(session, m.chave);
          }}
          className={clsx(
            "-mx-0.5 flex items-center justify-center rounded-full active:bg-black/20",
            compacto ? "h-4 w-4 text-[9px]" : "h-5 w-5 text-[10px]"
          )}
        >
          {/* O cifrão sai num círculo branco porque a cor é o recado: verde sobre
              bloco verde não diria nada. */}
          {m.cor ? (
            <span
              style={{ color: CORES_DA_MARCA[m.cor] }}
              className={clsx(
                "flex items-center justify-center rounded-full bg-white font-extrabold leading-none",
                compacto ? "h-3 w-3 text-[8px]" : "h-3.5 w-3.5 text-[10px]",
                // Cinza é estado neutro — presença ainda sem resposta, atendimento
                // isento. Discreto de propósito: senão a semana que vem inteira
                // grita por uma resposta que ainda não existe.
                m.cor === "cinza" && "opacity-60"
              )}
            >
              {m.icone}
            </span>
          ) : (
            m.icone
          )}
        </button>
      ))}
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
