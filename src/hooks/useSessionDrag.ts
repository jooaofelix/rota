import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionDoc } from "@/types";
import { HOUR_PX, minutesOf } from "@/utils/agenda";

const LONG_PRESS_MS = 300;
const SCROLL_CANCEL = 10;
/** Encaixe de 15 minutos: solta perto do horário certo e cai redondo. */
const SNAP_MIN = 15;

export interface DragPreview {
  sessionId: string;
  date: string;
  startTime: string;
  endTime: string;
}

function toTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 5, totalMinutes));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

/**
 * Arrastar um bloco da agenda para outro dia ou horário.
 *
 * O arraste só arma depois de segurar o bloco por um instante: a grade rola na
 * horizontal, e um arraste imediato tornaria impossível navegar entre os dias.
 * Enquanto está armado, um listener não-passivo bloqueia o touchmove, senão o
 * navegador rola a página em vez de deixar o bloco seguir o dedo.
 */
export function useSessionDrag(firstHour: number, onDrop: (preview: DragPreview) => void) {
  const [preview, setPreview] = useState<DragPreview | null>(null);
  const startRef = useRef<{ x: number; y: number; session: SessionDoc; el: HTMLElement; pointerId: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draggedRef = useRef(false);

  useEffect(() => {
    if (!preview) return;
    const block = (e: TouchEvent) => e.preventDefault();
    document.addEventListener("touchmove", block, { passive: false });
    return () => document.removeEventListener("touchmove", block);
  }, [preview]);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => () => clearTimer(), []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>, session: SessionDoc) => {
      const el = e.currentTarget;
      startRef.current = { x: e.clientX, y: e.clientY, session, el, pointerId: e.pointerId };
      draggedRef.current = false;
      clearTimer();
      timerRef.current = setTimeout(() => {
        const start = startRef.current;
        if (!start) return;
        try {
          start.el.setPointerCapture(start.pointerId);
        } catch {
          return;
        }
        draggedRef.current = true;
        navigator.vibrate?.(15);
        setPreview({
          sessionId: session.id,
          date: session.date,
          startTime: session.startTime,
          endTime: session.endTime,
        });
      }, LONG_PRESS_MS);
    },
    []
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const start = startRef.current;
      if (!start) return;

      if (!draggedRef.current) {
        if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > SCROLL_CANCEL) {
          clearTimer();
          startRef.current = null;
        }
        return;
      }

      // O bloco arrastado tem pointer-events desligado, então isto devolve a coluna de baixo.
      const under = document.elementFromPoint(e.clientX, e.clientY);
      const column = under?.closest<HTMLElement>("[data-day]");
      if (!column) return;

      const rect = column.getBoundingClientRect();
      const rawMinutes = firstHour * 60 + ((e.clientY - rect.top) / HOUR_PX) * 60;
      const duration = minutesOf(start.session.endTime) - minutesOf(start.session.startTime);
      const snapped = Math.round(rawMinutes / SNAP_MIN) * SNAP_MIN;

      setPreview({
        sessionId: start.session.id,
        date: column.dataset.day!,
        startTime: toTime(snapped),
        endTime: toTime(snapped + duration),
      });
    },
    [firstHour]
  );

  const finish = useCallback(
    (apply: boolean) => {
      clearTimer();
      const start = startRef.current;
      if (apply && draggedRef.current && preview && start) {
        const mudou =
          preview.date !== start.session.date || preview.startTime !== start.session.startTime;
        if (mudou) onDrop(preview);
      }
      startRef.current = null;
      setPreview(null);
    },
    [preview, onDrop]
  );

  /** Verdadeiro logo após um arraste, para o clique não abrir a folha da sessão. */
  const consumeDrag = useCallback(() => {
    const was = draggedRef.current;
    draggedRef.current = false;
    return was;
  }, []);

  return { preview, onPointerDown, onPointerMove, finish, consumeDrag };
}
