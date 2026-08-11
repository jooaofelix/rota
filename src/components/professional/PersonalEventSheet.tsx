import { useState } from "react";
import clsx from "clsx";
import { BottomSheet } from "@/components/common/BottomSheet";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";
import { removePersonalEvent, savePersonalEvent } from "@/services/personalEvents";
import type { PersonalEventDoc, PersonalKind } from "@/types";
import {
  PERSONAL_ICONS,
  PERSONAL_LABELS,
  PERSONAL_SUGGESTIONS,
  addMinutes,
} from "@/utils/personal";

const KINDS: PersonalKind[] = ["personal", "admin", "study", "break", "errand", "other"];

/**
 * Compromisso pessoal na agenda.
 *
 * Tem duas formas, e a diferença importa: com horário vira bloco na grade e
 * ocupa o tempo de verdade; sem horário vira demanda do dia, uma linha a riscar.
 * Muita coisa da rotina dela é do segundo tipo — precisa ser feito hoje, mas não
 * às 14h.
 */
export function PersonalEventSheet({
  professionalId,
  existing,
  defaultDate,
  onClose,
}: {
  professionalId: string;
  existing?: PersonalEventDoc;
  defaultDate: string;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [kind, setKind] = useState<PersonalKind>(existing?.kind ?? "personal");
  const [date, setDate] = useState(existing?.date ?? defaultDate);
  const [comHora, setComHora] = useState(!!existing?.startTime);
  const [startTime, setStartTime] = useState(existing?.startTime ?? "12:00");
  const [endTime, setEndTime] = useState(existing?.endTime ?? "13:00");
  const [note, setNote] = useState(existing?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  function aplicarSugestao(s: (typeof PERSONAL_SUGGESTIONS)[number]) {
    setTitle(s.title);
    setKind(s.kind);
    if (s.minutes) {
      setComHora(true);
      setEndTime(addMinutes(startTime, s.minutes));
    }
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await savePersonalEvent(existing?.id ?? null, {
        professionalId,
        title: title.trim(),
        kind,
        date,
        note: note.trim() || undefined,
        startTime: comHora ? startTime : undefined,
        endTime: comHora ? endTime : undefined,
        done: existing?.done ?? false,
      });
      showToast(comHora ? "Compromisso na agenda." : "Demanda do dia anotada.");
      onClose();
    } catch {
      showToast("Não deu para salvar agora.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!existing) return;
    await removePersonalEvent(existing.id);
    setConfirmandoExclusao(false);
    showToast("Removido da agenda.");
    onClose();
  }

  const valido = title.trim().length > 1 && (!comHora || endTime > startTime);

  return (
    <>
      <BottomSheet
        open
        onClose={onClose}
        title={existing ? "Editar compromisso" : "Compromisso pessoal"}
        footer={
          <div className="flex flex-col gap-2">
            <button onClick={handleSave} disabled={!valido || saving} className="btn-primary">
              {saving ? "Salvando..." : existing ? "Salvar" : "Adicionar ao dia"}
            </button>
            {existing && (
              <button
                onClick={() => setConfirmandoExclusao(true)}
                className="text-sm font-bold text-rose-500"
              >
                Remover
              </button>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {!existing && (
            <div>
              <p className="mb-1.5 text-xs font-bold text-brand-500">Atalhos</p>
              <div className="flex flex-wrap gap-1.5">
                {PERSONAL_SUGGESTIONS.map((s) => (
                  <button
                    key={s.title}
                    onClick={() => aplicarSugestao(s)}
                    className={clsx(
                      "rounded-full px-3 py-1.5 text-xs font-bold",
                      title === s.title ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-600"
                    )}
                  >
                    {PERSONAL_ICONS[s.kind]} {s.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-1 text-xs font-bold text-brand-500">O que é</p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Supervisão, banco, buscar na escola..."
              className="input-field"
            />
          </div>

          <div>
            <p className="mb-1.5 text-xs font-bold text-brand-500">Tipo</p>
            <div className="flex flex-wrap gap-1.5">
              {KINDS.map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={clsx(
                    "rounded-full px-3 py-1.5 text-xs font-bold",
                    kind === k ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-600"
                  )}
                >
                  {PERSONAL_ICONS[k]} {PERSONAL_LABELS[k]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-bold text-brand-500">Dia</p>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <div className="mb-2 flex gap-2">
              <button
                onClick={() => setComHora(true)}
                className={clsx(
                  "flex-1 rounded-xl px-3 py-2 text-sm font-bold",
                  comHora ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-600"
                )}
              >
                Tem horário
              </button>
              <button
                onClick={() => setComHora(false)}
                className={clsx(
                  "flex-1 rounded-xl px-3 py-2 text-sm font-bold",
                  !comHora ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-600"
                )}
              >
                Só durante o dia
              </button>
            </div>

            {comHora ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="mb-1 text-[11px] font-bold text-brand-500">Início</p>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      if (e.target.value >= endTime) setEndTime(addMinutes(e.target.value, 60));
                    }}
                    className="input-field"
                  />
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-bold text-brand-500">Fim</p>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
            ) : (
              <p className="rounded-2xl bg-cream-100 p-3 text-xs leading-snug text-brand-500">
                Fica na lista de demandas do dia, com uma caixinha para riscar quando terminar. Não
                ocupa horário na grade.
              </p>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-bold text-brand-500">Observação (opcional)</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Endereço, o que levar, com quem falar..."
              className="input-field resize-none text-sm"
            />
          </div>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={confirmandoExclusao}
        title="Remover este compromisso?"
        description="Ele sai da agenda e da lista do dia."
        confirmLabel="Remover"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmandoExclusao(false)}
      />
    </>
  );
}
