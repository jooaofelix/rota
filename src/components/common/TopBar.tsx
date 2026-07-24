import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface TopBarProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  action?: ReactNode;
}

export function TopBar({ title, subtitle, back, action }: TopBarProps) {
  const navigate = useNavigate();

  return (
    <header className="safe-top sticky top-0 z-20 bg-cream-50/95 px-4 pb-3 pt-4 backdrop-blur">
      <div className="flex items-center gap-2">
        {back && (
          <button
            onClick={() => navigate(-1)}
            aria-label="Voltar"
            className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-brand-600 active:bg-brand-50"
          >
            ←
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-lg font-extrabold leading-tight text-brand-900">{title}</h1>
          {subtitle && <p className="text-sm text-brand-400">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}
