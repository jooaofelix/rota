import { useRef, useState } from "react";
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
}

interface PriorityBoardProps {
  items: BoardItem[];
  onChange: (items: BoardItem[]) => void;
}

/** A partir de quantos pixels o toque deixa de ser um tap e passa a ser um arraste. */
const DRAG_THRESHOLD = 8;

/**
 * Quatro quadros de prioridade com arrastar-e-soltar entre eles.
 *
 * O arraste usa Pointer Events (mouse e toque no mesmo caminho) e só começa pelo
 * pegador — que é o único elemento com `touch-action: none`, senão o dedo deixaria
 * de rolar a página. Quem não quiser arrastar toca no cartão e escolhe o quadro
 * numa lista, então nada aqui depende exclusivamente do gesto.
 */
export function PriorityBoard({ items, onChange }: PriorityBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [overBucket, setOverBucket] = useState<Priority | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const startRef = useRef<{ x: number; y: number; id: string } | null>(null);

  const draggingItem = items.find((i) => i.id === draggingId) ?? null;

  function move(id: string, priority: Priority) {
    const current = items.find((i) => i.id === id);
    if (!current || current.priority === priority) return;
    onChange(items.map((i) => (i.id === id ? { ...i, priority } : i)));
  }

  function handlePointerDown(e: React.PointerEvent<HTMLElement>, id: string) {
    startRef.current = { x: e.clientX, y: e.clientY, id };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLElement>) {
    const start = startRef.current;
    if (!start) return;

    if (!draggingId) {
      const travelled = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      if (travelled < DRAG_THRESHOLD) return;
      setDraggingId(start.id);
      setOpenMenuId(null);
    }

    setPointer({ x: e.clientX, y: e.clientY });
    // O cartão flutuante tem pointer-events: none, então elementFromPoint devolve o quadro de baixo.
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const bucket = under?.closest<HTMLElement>("[data-bucket]")?.dataset.bucket;
    setOverBucket((bucket as Priority | undefined) ?? null);
  }

  function endDrag(apply: boolean) {
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
            <div className="mb-2 flex items-baseline justify-between gap-2">
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
                      "rounded-xl border border-brand-100 bg-white p-2 shadow-sm transition-opacity",
                      draggingId === item.id && "opacity-40"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        role="button"
                        tabIndex={-1}
                        aria-label={`Arrastar ${item.title}`}
                        onPointerDown={(e) => handlePointerDown(e, item.id)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={() => endDrag(true)}
                        onPointerCancel={() => endDrag(false)}
                        className="flex h-9 w-6 shrink-0 cursor-grab select-none items-center justify-center text-base text-brand-300 active:cursor-grabbing"
                        style={{ touchAction: "none" }}
                      >
                        ⠿
                      </span>
                      <span className="shrink-0 text-xl">{item.icon}</span>
                      <button
                        type="button"
                        onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-bold text-brand-800">{item.title}</p>
                        {item.hint && <p className="truncate text-xs text-brand-400">{item.hint}</p>}
                      </button>
                    </div>

                    {openMenuId === item.id && (
                      <div className="mt-2 border-t border-brand-50 pt-2">
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
