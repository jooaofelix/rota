import type { ReactNode } from "react";
import { createPortal } from "react-dom";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-brand-900/40" onClick={onClose} />
      <div className="safe-bottom animate-pop-in relative z-10 max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-card">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-brand-100" />
        {title && <h2 className="mb-3 text-lg font-extrabold text-brand-900">{title}</h2>}
        {children}
      </div>
    </div>,
    document.body
  );
}
