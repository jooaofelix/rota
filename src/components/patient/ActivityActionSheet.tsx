import { useState } from "react";
import { BottomSheet } from "@/components/common/BottomSheet";
import { FeelingPicker } from "./FeelingPicker";
import type { FeelingKey, RoutineItemDoc, SkipReasonKey } from "@/types";
import { completeActivity, skipActivity } from "@/services/completions";
import { SKIP_REASON_OPTIONS, DIFFICULTY_MESSAGES, POSITIVE_MESSAGES, SKIP_MESSAGES } from "@/utils/constants";
import { useToast } from "@/contexts/ToastContext";
import clsx from "clsx";

type Step = "choose" | "feeling" | "skip";

const DIFFICULT_FEELINGS: FeelingKey[] = ["difficulty", "needed_help", "not_finished", "sad", "anxious", "angry"];

export function ActivityActionSheet({ item, onClose }: { item: RoutineItemDoc; onClose: () => void }) {
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>("choose");
  const [pendingStatus, setPendingStatus] = useState<"completed" | "partial">("completed");
  const [feeling, setFeeling] = useState<FeelingKey | null>(null);
  const [comment, setComment] = useState("");
  const [neededHelp, setNeededHelp] = useState(false);
  const [skipReason, setSkipReason] = useState<SkipReasonKey | null>(null);
  const [otherText, setOtherText] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleConfirmFeeling() {
    if (!feeling) return;
    setSaving(true);
    try {
      await completeActivity({ routineItem: item, status: pendingStatus, feeling, comment: comment.trim() || undefined, neededHelp });
      const isDifficult = DIFFICULT_FEELINGS.includes(feeling);
      const pool = isDifficult ? DIFFICULTY_MESSAGES : POSITIVE_MESSAGES;
      showToast(pool[Math.floor(Math.random() * pool.length)], "success");
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmSkip() {
    if (!skipReason) return;
    setSaving(true);
    try {
      await skipActivity(item, skipReason, skipReason === "other" ? otherText.trim() : undefined);
      showToast(SKIP_MESSAGES[Math.floor(Math.random() * SKIP_MESSAGES.length)], "info");
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open onClose={onClose} title={item.title}>
      {step === "choose" && (
        <div className="flex flex-col gap-2.5">
          <p className="text-sm text-brand-500">Como foi essa atividade?</p>
          <button
            className="btn-primary"
            onClick={() => {
              setPendingStatus("completed");
              setStep("feeling");
            }}
          >
            ✅ Concluí totalmente
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              setPendingStatus("partial");
              setNeededHelp(false);
              setStep("feeling");
            }}
          >
            🔵 Concluí parcialmente
          </button>
          <button className="btn-secondary" onClick={() => setStep("skip")}>
            ⏸️ Não consegui fazer
          </button>
        </div>
      )}

      {step === "feeling" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-brand-700">Como você se sentiu realizando essa atividade?</p>
          <FeelingPicker value={feeling} onChange={setFeeling} />

          <label className="mt-1 flex items-center gap-2 text-sm text-brand-500">
            <input type="checkbox" checked={neededHelp} onChange={(e) => setNeededHelp(e.target.checked)} className="h-4 w-4 rounded border-brand-300" />
            Precisei de ajuda de alguém
          </label>

          <div>
            <p className="mb-1 text-sm font-semibold text-brand-600">Quer contar alguma coisa sobre essa atividade? (opcional)</p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="input-field resize-none"
              placeholder="Escreva aqui se quiser..."
            />
          </div>

          <button className="btn-primary" onClick={handleConfirmFeeling} disabled={!feeling || saving}>
            {saving ? "Salvando..." : "Confirmar"}
          </button>
        </div>
      )}

      {step === "skip" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-brand-700">Tudo bem. O que aconteceu?</p>
          <div className="grid grid-cols-2 gap-2">
            {SKIP_REASON_OPTIONS.map((option) => (
              <button
                key={option.key}
                onClick={() => setSkipReason(option.key)}
                className={clsx(
                  "flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-3 text-center",
                  skipReason === option.key ? "border-brand-500 bg-brand-50" : "border-brand-100 bg-white"
                )}
              >
                <span className="text-2xl">{option.emoji}</span>
                <span className="text-xs font-bold text-brand-700">{option.label}</span>
              </button>
            ))}
          </div>

          {skipReason === "other" && (
            <input
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="Conte com suas palavras..."
              className="input-field"
            />
          )}

          <button className="btn-primary" onClick={handleConfirmSkip} disabled={!skipReason || saving}>
            {saving ? "Salvando..." : "Confirmar"}
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
