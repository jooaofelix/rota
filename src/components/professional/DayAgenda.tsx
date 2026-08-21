import { useMemo } from "react";
import clsx from "clsx";
import { setPersonalEventDone } from "@/services/personalEvents";
import type { PersonalEventDoc, SessionDoc } from "@/types";
import { PAYMENT_LABELS, PAYMENT_STYLES, formatMoney, marcasDaSessao, sessionColor } from "@/utils/agenda";
import { formatShortDate, isDateKeyToday } from "@/utils/date";
import { PERSONAL_COLORS, PERSONAL_ICONS } from "@/utils/personal";

/**
 * O dia inteiro numa lista só: atendimento e vida pessoal na mesma ordem do
 * relógio.
 *
 * A grade da semana responde "quando eu atendo"; esta tela responde "o que eu
 * tenho hoje", que é outra pergunta. Enquanto as duas coisas viviam em lugares
 * diferentes — uma no app, outra na cabeça —, a resposta nunca estava inteira.
 */
export function DayAgenda({
  date,
  sessions,
  events,
  onPrev,
  onNext,
  onToday,
  onOpenSession,
  onOpenEvent,
  onNewEvent,
}: {
  date: string;
  sessions: SessionDoc[];
  events: PersonalEventDoc[];
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onOpenSession: (s: SessionDoc) => void;
  onOpenEvent: (e: PersonalEventDoc) => void;
  onNewEvent: () => void;
}) {
  const doDia = useMemo(() => {
    const atendimentos = sessions
      .filter((s) => s.date === date && s.status !== "cancelled")
      .map((s) => ({ tipo: "sessao" as const, hora: s.startTime, session: s }));
    const comHora = events
      .filter((e) => e.date === date && e.startTime)
      .map((e) => ({ tipo: "evento" as const, hora: e.startTime!, event: e }));
    const linha = [...atendimentos, ...comHora].sort((a, b) => a.hora.localeCompare(b.hora));
    const demandas = events.filter((e) => e.date === date && !e.startTime);
    return { linha, demandas };
  }, [date, sessions, events]);

  const vazio = doDia.linha.length === 0 && doDia.demandas.length === 0;
  const feitas = doDia.demandas.filter((d) => d.done).length;

  return (
    <div className="px-4 pb-4">
      <div className="mb-3 flex items-center justify-center gap-2">
        <Nav label="‹" onClick={onPrev} />
        <button
          onClick={onToday}
          className="rounded-full bg-white px-4 py-1.5 text-sm font-bold text-brand-600 shadow-card"
        >
          {isDateKeyToday(date) ? "Hoje" : formatShortDate(date)}
        </button>
        <Nav label="›" onClick={onNext} />
      </div>

      {vazio ? (
        <div className="card mb-3 text-center">
          <p className="text-3xl">🌤️</p>
          <p className="mt-1 text-sm font-bold text-brand-700">Dia livre</p>
          <p className="mt-1 text-xs text-brand-400">
            Nenhum atendimento e nenhum compromisso anotado para este dia.
          </p>
        </div>
      ) : (
        <>
          {doDia.linha.length > 0 && (
            <div className="card mb-3">
              <p className="mb-2 text-sm font-bold text-brand-700">Com hora marcada</p>
              <div className="flex flex-col">
                {doDia.linha.map((linha) =>
                  linha.tipo === "sessao" ? (
                    <Linha
                      key={linha.session.id}
                      cor={sessionColor(linha.session)}
                      hora={linha.session.startTime}
                      fim={linha.session.endTime}
                      titulo={linha.session.patientName}
                      detalhe={marcasDaSessao(linha.session)
                        .map((m) => `${m.icone} ${m.titulo}`)
                        .join(" · ")}
                      onClick={() => onOpenSession(linha.session)}
                      etiqueta={
                        linha.session.price ? (
                          <span
                            className={clsx(
                              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold",
                              PAYMENT_STYLES[linha.session.paymentStatus]
                            )}
                          >
                            {linha.session.paymentStatus === "paid"
                              ? PAYMENT_LABELS.paid
                              : formatMoney(linha.session.price)}
                          </span>
                        ) : undefined
                      }
                    />
                  ) : (
                    <Linha
                      key={linha.event.id}
                      cor={PERSONAL_COLORS[linha.event.kind]}
                      hora={linha.event.startTime!}
                      fim={linha.event.endTime}
                      titulo={`${PERSONAL_ICONS[linha.event.kind]} ${linha.event.title}`}
                      detalhe={linha.event.note}
                      pessoal
                      onClick={() => onOpenEvent(linha.event)}
                    />
                  )
                )}
              </div>
            </div>
          )}

          {doDia.demandas.length > 0 && (
            <div className="card mb-3">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <p className="text-sm font-bold text-brand-700">Durante o dia</p>
                <span className="shrink-0 text-xs font-bold text-brand-400">
                  {feitas} de {doDia.demandas.length}
                </span>
              </div>
              <div className="flex flex-col">
                {doDia.demandas.map((d) => (
                  <div key={d.id} className="flex items-start gap-2.5 border-b border-brand-50 py-2.5 last:border-b-0">
                    <button
                      onClick={() => setPersonalEventDone(d.id, !d.done).catch(() => undefined)}
                      aria-label={d.done ? "Desmarcar" : "Marcar como feito"}
                      className={clsx(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-[11px] font-bold",
                        d.done ? "border-brand-500 bg-brand-500 text-white" : "border-brand-200"
                      )}
                    >
                      {d.done ? "✓" : ""}
                    </button>
                    <button onClick={() => onOpenEvent(d)} className="min-w-0 flex-1 text-left">
                      <p
                        className={clsx(
                          "truncate text-sm font-bold",
                          d.done ? "text-brand-300 line-through" : "text-brand-800"
                        )}
                      >
                        {PERSONAL_ICONS[d.kind]} {d.title}
                      </p>
                      {d.note && <p className="truncate text-xs text-brand-400">{d.note}</p>}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <button onClick={onNewEvent} className="btn-primary">
        + Compromisso pessoal
      </button>
      <p className="mt-2 text-center text-xs leading-snug text-brand-400">
        O que tem hora entra na grade da semana e ocupa o horário. O que não tem fica aqui, só para
        riscar.
      </p>
    </div>
  );
}

function Nav({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-bold text-brand-500 shadow-card"
    >
      {label}
    </button>
  );
}

function Linha({
  cor,
  hora,
  fim,
  titulo,
  detalhe,
  etiqueta,
  pessoal,
  onClick,
}: {
  cor: string;
  hora: string;
  fim?: string;
  titulo: string;
  detalhe?: string;
  etiqueta?: React.ReactNode;
  pessoal?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-2.5 border-b border-brand-50 py-2.5 text-left last:border-b-0"
    >
      <span className="w-11 shrink-0 text-sm font-bold text-brand-700">{hora.replace(":", "h")}</span>
      {/* Barra colorida em vez de bolinha com iniciais: o compromisso pessoal não
          tem paciente, e a barra serve para os dois sem parecer remendo. */}
      <span
        className={clsx("mt-0.5 w-1 shrink-0 self-stretch rounded-full", pessoal && "opacity-60")}
        style={{ backgroundColor: cor }}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-brand-800">{titulo}</span>
        <span className="block truncate text-xs text-brand-400">
          {fim ? `até ${fim.replace(":", "h")}` : ""}
          {fim && detalhe ? " · " : ""}
          {detalhe}
        </span>
      </span>
      {etiqueta}
    </button>
  );
}
