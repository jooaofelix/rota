import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /**
   * Botões de ação da folha. Ficam presos no rodapé, fora da área que rola, para
   * continuarem à vista em tela pequena — num iPhone SE o "Salvar" caía logo
   * abaixo da dobra e parecia que a folha não tinha botão nenhum.
   */
  footer?: ReactNode;
}

export function BottomSheet({ open, onClose, title, children, footer }: BottomSheetProps) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-brand-900/40" onClick={onClose} />
      {/* dvh desconta a barra do navegador no celular; quem não conhece a unidade
          descarta a linha do style e fica com o vh da classe. */}
      <div
        style={{ maxHeight: "90dvh" }}
        className="animate-pop-in relative z-10 flex max-h-[90vh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-card"
      >
        <div className="shrink-0 px-5 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-brand-100" />
          {title && <h2 className="mb-3 text-lg font-extrabold text-brand-900">{title}</h2>}
        </div>

        <div className={clsx("min-h-0 flex-1 overflow-y-auto px-5 pb-5", !footer && "safe-bottom")}>
          {children}
        </div>

        {footer && (
          <div className="safe-bottom shrink-0 border-t border-brand-100 bg-white px-5 py-3">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}
