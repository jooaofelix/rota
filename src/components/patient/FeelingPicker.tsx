import clsx from "clsx";
import type { FeelingKey } from "@/types";
import { FEELING_OPTIONS } from "@/utils/constants";

interface FeelingPickerProps {
  value: FeelingKey | null;
  onChange: (feeling: FeelingKey) => void;
}

export function FeelingPicker({ value, onChange }: FeelingPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {FEELING_OPTIONS.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          className={clsx(
            "flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-3 text-center transition active:scale-95",
            value === option.key ? "border-brand-500 bg-brand-50" : "border-brand-100 bg-white"
          )}
        >
          <span className="text-3xl">{option.emoji}</span>
          <span className="text-xs font-bold text-brand-700">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
