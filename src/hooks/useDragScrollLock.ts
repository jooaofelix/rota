import { useEffect, type MutableRefObject } from "react";

/**
 * Impede a rolagem da página enquanto um arraste está ativo.
 *
 * O listener é registrado uma vez, na montagem, e não quando o arraste começa.
 * Essa diferença é o que faz o gesto funcionar no celular: iOS e Android decidem
 * logo no início do toque se aquilo vai ser rolagem, e ignoram o `preventDefault`
 * de um listener que só apareceu no meio do caminho — o navegador rola, dispara
 * `pointercancel` e o arraste morre antes de sair do lugar.
 *
 * Por isso o listener existe desde sempre e consulta uma ref para saber se deve
 * ou não barrar o movimento. Ref, e não estado, para não precisar reassinar o
 * listener a cada mudança.
 */
export function useDragScrollLock(activeRef: MutableRefObject<boolean>) {
  useEffect(() => {
    const block = (e: TouchEvent) => {
      if (activeRef.current) e.preventDefault();
    };
    document.addEventListener("touchmove", block, { passive: false });
    return () => document.removeEventListener("touchmove", block);
  }, [activeRef]);
}
