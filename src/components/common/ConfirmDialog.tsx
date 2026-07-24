import { createPortal } from "react-dom";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
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
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-brand-900/40" onClick={onCancel} />
      <div className="animate-pop-in relative z-10 w-full max-w-sm rounded-2xl bg-white p-5 shadow-card">
        <h2 className="text-base font-extrabold text-brand-900">{title}</h2>
        {description && <p className="mt-1.5 text-sm text-brand-500">{description}</p>}
        <div className="mt-4 flex gap-2">
          <button className="btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={danger ? "flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 py-3.5 text-base font-bold text-white active:scale-[0.98]" : "btn-primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
