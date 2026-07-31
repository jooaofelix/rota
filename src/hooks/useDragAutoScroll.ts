import { useEffect, type MutableRefObject } from "react";

/** Faixa da borda que dispara a rolagem, e velocidade máxima em pixels por quadro. */
const EDGE = 76;
const MAX_SPEED = 16;

function speedAt(distance: number): number {
  return Math.ceil(((EDGE - distance) / EDGE) * MAX_SPEED);
}

/**
 * Rola a tela sozinha quando o dedo chega perto da borda durante um arraste.
 *
 * Sem isto o arraste só alcança o que já está visível — e num celular os quatro
 * quadros de prioridade não cabem juntos na tela, nem os sete dias da agenda. O
 * destino ficava inalcançável, o que na prática parecia que arrastar não funcionava.
 *
 * A rolagem horizontal age no container marcado com `data-hscroll`; a vertical, na
 * janela. A cada quadro `onTick` é chamado para o componente recalcular o alvo sob
 * o dedo: com o dedo parado e a tela andando, nenhum `pointermove` chegaria.
 */
export function useDragAutoScroll(
  activeRef: MutableRefObject<boolean>,
  pointRef: MutableRefObject<{ x: number; y: number }>,
  onTick?: () => void
) {
  useEffect(() => {
    let raf = 0;

    const step = () => {
      raf = requestAnimationFrame(step);
      if (!activeRef.current) return;

      const { x, y } = pointRef.current;
      let moved = false;

      const fromTop = y;
      const fromBottom = window.innerHeight - y;
      if (fromTop < EDGE) {
        window.scrollBy(0, -speedAt(fromTop));
        moved = true;
      } else if (fromBottom < EDGE) {
        window.scrollBy(0, speedAt(fromBottom));
        moved = true;
      }

      const hscroll = document.querySelector<HTMLElement>("[data-hscroll]");
      if (hscroll) {
        const rect = hscroll.getBoundingClientRect();
        if (y >= rect.top && y <= rect.bottom) {
          const fromLeft = x - rect.left;
          const fromRight = rect.right - x;
          if (fromLeft < EDGE && hscroll.scrollLeft > 0) {
            hscroll.scrollLeft -= speedAt(fromLeft);
            moved = true;
          } else if (fromRight < EDGE) {
            hscroll.scrollLeft += speedAt(fromRight);
            moved = true;
          }
        }
      }

      if (moved) onTick?.();
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [activeRef, pointRef, onTick]);
}
