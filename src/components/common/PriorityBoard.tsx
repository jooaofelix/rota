import { useEffect, useRef, useState } from "react";
import { useDragScrollLock } from "@/hooks/useDragScrollLock";
import { useDragAutoScroll } from "@/hooks/useDragAutoScroll";
import { createPortal } from "react-dom";
import clsx from "clsx";
import type { Priority } from "@/types";
import { PRIORITY_EMOJI, PRIORITY_HINTS, PRIORITY_LABELS, PRIORITY_ORDER, PRIORITY_STYLES } from "@/utils/constants";

export interface BoardItem {
  id: string;
  title: string;
  icon: string;
  priority: Priority;
  /** Texto pequeno abaixo do título (período, horário...). */
  hint?: string;
  /** Atividade que o usuário atual não pode reorganizar (ex.: criada pela profissional). */
  locked?: boolean;
}

interface PriorityBoardProps {
  items: BoardItem[];
  onChange: (items: BoardItem[]) => void;
  /** Explicação mostrada ao tocar numa atividade travada. */
  lockedHint?: string;
}

/** Distância que cancela o toque longo por ser rolagem, e a que inicia o arraste pelo pegador. */
const SCROLL_CANCEL = 10;
const GRIP_THRESHOLD = 8;
const LONG_PRESS_MS = 300;

/**
 * O ícone ignora o ponteiro de propósito. `touch-action` não é herdado, e o alvo
 * do toque é o elemento sob o dedo: se o svg fosse alvo, ele valeria `auto` e o
 * navegador trataria o gesto como rolagem — engolindo os `pointermove` sem os
 * quais o arraste nunca começa.
 */
function GripIcon() {
  return (
    <svg
      viewBox="0 0 10 16"
      className="pointer-events-none h-4 w-2.5"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="2" cy="3" r="1.4" />
      <circle cx="8" cy="3" r="1.4" />
      <circle cx="2" cy="8" r="1.4" />
      <circle cx="8" cy="8" r="1.4" />
      <circle cx="2" cy="13" r="1.4" />
      <circle cx="8" cy="13" r="1.4" />
    </svg>
  );
}

/**
 * Quatro quadros de prioridade com arrastar-e-soltar entre eles.
 *
 * Há três formas de mover uma atividade, de propósito: arrastar pelo pegador,
 * segurar o cartão por um instante e arrastar, ou tocar e escolher o quadro numa
 * lista. O gesto nunca é o único caminho — parte do público do app tem
 * dificuldade motora, e num toque longo mal calibrado a alternativa salva a tela.
 *
 * Detalhe de toque: enquanto o arraste está ativo um listener não-passivo bloqueia
 * o `touchmove`, senão o navegador rola a página em vez de deixar o cartão seguir
 * o dedo. O pegador leva `touch-action: none` para dispensar o toque longo.
 */
export function PriorityBoard({ items, onChange, lockedHint }: PriorityBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [overBucket, setOverBucket] = useState<Priority | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const startRef = useRef<{
    x: number;
    y: number;
    id: string;
    viaGrip: boolean;
    el: HTMLElement;
    pointerId: number;
  } | null>(null);
  /** Espelha o estado de arraste para o bloqueio de rolagem, que lê por ref. */
  const draggingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const draggingItem = items.find((i) => i.id === draggingId) ?? null;

  useDragScrollLock(draggingRef);

  /** Recalcula o quadro sob o dedo — a tela pode ter andado sem o dedo se mover. */
  function refreshHover() {
    const { x, y } = lastPointRef.current;
    setPointer({ x, y });
    const under = document.elementFromPoint(x, y);
    const bucket = under?.closest<HTMLElement>("[data-bucket]")?.dataset.bucket;
    setOverBucket((bucket as Priority | undefined) ?? null);
  }

  useDragAutoScroll(draggingRef, lastPointRef, refreshHover);

  useEffect(() => {
    draggingRef.current = draggingId !== null;
  }, [draggingId]);

  useEffect(() => () => clearTimer(), []);

  function clearTimer() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  function move(id: string, priority: Priority) {
    const current = items.find((i) => i.id === id);
    if (!current || current.locked || current.priority === priority) return;
    onChange(items.map((i) => (i.id === id ? { ...i, priority } : i)));
  }

  function beginDrag(id: string) {
    const start = startRef.current;
    // Só capturamos o ponteiro aqui, e não no pointerdown: capturar no corpo do cartão
    // redireciona o "click" para a div e o botão de abrir o menu nunca dispara.
    if (start && !start.viaGrip) {
      try {
        start.el.setPointerCapture(start.pointerId);
      } catch {
        // ponteiro já solto; o arraste simplesmente não começa
      }
    }
    setDraggingId(id);
    setPointer(lastPointRef.current);
    setOpenMenuId(null);
    navigator.vibrate?.(15);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLElement>, item: BoardItem, viaGrip: boolean) {
    if (item.locked) return;
    startRef.current = { x: e.clientX, y: e.clientY, id: item.id, viaGrip, el: e.currentTarget, pointerId: e.pointerId };
    lastPointRef.current = { x: e.clientX, y: e.clientY };

    if (viaGrip) {
      // No pegador não há nada clicável dentro, então capturar já é seguro — e necessário
      // para o arraste continuar valendo quando o dedo sai de cima dele.
      e.currentTarget.setPointerCapture(e.pointerId);
    } else {
      clearTimer();
      timerRef.current = setTimeout(() => beginDrag(item.id), LONG_PRESS_MS);
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLElement>) {
    const start = startRef.current;
    if (!start) return;
    lastPointRef.current = { x: e.clientX, y: e.clientY };
    const travelled = Math.hypot(e.clientX - start.x, e.clientY - start.y);

    if (!draggingId) {
      if (start.viaGrip) {
        if (travelled < GRIP_THRESHOLD) return;
        beginDrag(start.id);
      } else {
        // Moveu antes do toque longo completar: é rolagem, não arraste.
        if (travelled > SCROLL_CANCEL) {
          clearTimer();
          startRef.current = null;
        }
        return;
      }
    }

    setPointer({ x: e.clientX, y: e.clientY });
    // O cartão flutuante tem pointer-events: none, então elementFromPoint devolve o quadro de baixo.
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const bucket = under?.closest<HTMLElement>("[data-bucket]")?.dataset.bucket;
    setOverBucket((bucket as Priority | undefined) ?? null);
  }

  function endDrag(apply: boolean) {
    clearTimer();
    if (apply && draggingId && overBucket) move(draggingId, overBucket);
    startRef.current = null;
    setDraggingId(null);
    setPointer(null);
    setOverBucket(null);
  }

  return (
    <div className="flex flex-col gap-3">
      {PRIORITY_ORDER.map((priority) => {
        const style = PRIORITY_STYLES[priority];
        const bucketItems = items.filter((i) => i.priority === priority);
        const isTarget = draggingId !== null && overBucket === priority;

        return (
          <section
            key={priority}
            data-bucket={priority}
            className={clsx(
              "rounded-2xl border-2 border-dashed p-3 transition-colors",
              isTarget ? "border-brand-500 bg-brand-50" : `${style.border} ${style.bg}`
            )}
          >
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <p className={clsx("text-sm font-extrabold", style.text)}>
                {PRIORITY_EMOJI[priority]} {PRIORITY_LABELS[priority]}
              </p>
              <span className="shrink-0 text-xs font-bold text-brand-400">
                {bucketItems.length === 1 ? "1 atividade" : `${bucketItems.length} atividades`}
              </span>
            </div>
            <p className="mb-2 text-xs leading-snug text-brand-500">{PRIORITY_HINTS[priority]}</p>

            {bucketItems.length === 0 ? (
              <p className="rounded-xl bg-white/70 px-3 py-3 text-center text-xs font-semibold text-brand-300">
                {isTarget ? "Solte aqui" : "Nenhuma atividade neste quadro"}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {bucketItems.map((item) => (
                  <div
                    key={item.id}
                    className={clsx(
                      "rounded-xl border border-brand-100 bg-white shadow-sm transition-opacity",
                      draggingId === item.id && "opacity-40"
                    )}
                  >
                    <div className="flex items-stretch">
                      {!item.locked && (
                        <span
                          role="button"
                          tabIndex={-1}
                          aria-label={`Arrastar ${item.title}`}
                          onPointerDown={(e) => handlePointerDown(e, item, true)}
                          onPointerMove={handlePointerMove}
                          onPointerUp={() => endDrag(true)}
                          onPointerCancel={() => endDrag(false)}
                          className="flex w-8 shrink-0 cursor-grab select-none items-center justify-center rounded-l-xl text-brand-300 active:cursor-grabbing active:bg-brand-50"
                          style={{ touchAction: "none" }}
                        >
                          <GripIcon />
                        </span>
                      )}
                      <div
                        onPointerDown={(e) => handlePointerDown(e, item, false)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={() => endDrag(true)}
                        onPointerCancel={() => endDrag(false)}
                        className="flex min-w-0 flex-1 select-none items-center gap-2 p-2 pl-1"
                        style={{ WebkitTouchCallout: "none" }}
                      >
                        <span className="shrink-0 text-xl">{item.icon}</span>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-sm font-bold text-brand-800">{item.title}</p>
                          {item.hint && <p className="truncate text-xs text-brand-400">{item.hint}</p>}
                        </button>
                        {item.locked && <span className="shrink-0 text-sm">🔒</span>}
                      </div>
                    </div>

                    {openMenuId === item.id && (
                      <div className="border-t border-brand-50 px-2 pb-2 pt-2">
                        {item.locked ? (
                          <p className="text-xs leading-snug text-brand-500">
                            {lockedHint ?? "Esta atividade não pode ser reorganizada por aqui."}
                          </p>
                        ) : (
                          <>
                            <p className="mb-1.5 text-xs font-bold text-brand-500">Mover para:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {PRIORITY_ORDER.filter((p) => p !== priority).map((p) => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => {
                                    move(item.id, p);
                                    setOpenMenuId(null);
                                  }}
                                  className={clsx("rounded-full px-2.5 py-1 text-xs font-bold", PRIORITY_STYLES[p].chip)}
                                >
                                  {PRIORITY_EMOJI[p]} {PRIORITY_LABELS[p]}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {draggingItem &&
        pointer &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[60] w-56 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-brand-400 bg-white p-2 shadow-lg"
            style={{ left: pointer.x, top: pointer.y }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{draggingItem.icon}</span>
              <p className="truncate text-sm font-bold text-brand-800">{draggingItem.title}</p>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
