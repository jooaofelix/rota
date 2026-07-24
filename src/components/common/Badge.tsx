import clsx from "clsx";
import type { ReactNode } from "react";

const TONES = {
  neutral: "bg-brand-50 text-brand-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-rose-100 text-rose-700",
  success: "bg-brand-100 text-brand-700",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof TONES }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", TONES[tone])}>
      {children}
    </span>
  );
}
