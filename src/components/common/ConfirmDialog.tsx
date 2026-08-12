import { createPortal } from "react-dom";
import clsx from "clsx";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** Ação em andamento: trava os dois botões e o toque no fundo. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger,
  busy,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      {/* Enquanto roda, o fundo não cancela: uma exclusão em lote leva alguns
          segundos, e fechar no meio dava a impressão de que nada aconteceu. */}
      <div className="absolute inset-0 bg-brand-900/40" onClick={busy ? undefined : onCancel} />
      <div className="animate-pop-in relative z-10 w-full max-w-sm rounded-2xl bg-white p-5 shadow-card">
        <h2 className="text-base font-extrabold text-brand-900">{title}</h2>
        {description && <p className="mt-1.5 text-sm text-brand-500">{description}</p>}
        <div className="mt-4 flex gap-2">
          <button className="btn-secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            className={clsx(
              danger
                ? "flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 py-3.5 text-base font-bold text-white active:scale-[0.98]"
                : "btn-primary",
              busy && "opacity-60"
            )}
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
