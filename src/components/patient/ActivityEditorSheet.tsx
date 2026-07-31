import { useState } from "react";
import { BottomSheet } from "@/components/common/BottomSheet";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import type { ActivityCategory, Period, Priority, RoutineItemDoc } from "@/types";
import { CATEGORY_LABELS, ICON_OPTIONS, PERIOD_LABELS, PRIORITY_LABELS, PRIORITY_ORDER, WEEKDAY_LABELS } from "@/utils/constants";
import { createRoutineItem, deleteRoutineItem, updateRoutineItem } from "@/services/routines";
import { useToast } from "@/contexts/ToastContext";
import clsx from "clsx";

interface ActivityEditorSheetProps {
  patientId: string;
  professionalId: string;
  routineId: string;
  existingItem?: RoutineItemDoc;
  onClose: () => void;
}

const emptyForm = {
  title: "",
  description: "",
  period: "morning" as Period,
  time: "",
  date: "",
  durationMinutes: 10,
  frequency: "daily" as RoutineItemDoc["frequency"],
  weekdays: [] as number[],
  category: "custom" as ActivityCategory,
  priority: "medium" as Priority,
  icon: "⭐",
};

/** Editor de atividades para o próprio paciente montar sua rotina (sem os campos de uso exclusivo da profissional). */
export function ActivityEditorSheet({ patientId, professionalId, routineId, existingItem, onClose }: ActivityEditorSheetProps) {
  const { showToast } = useToast();
  const [form, setForm] = useState(() =>
    existingItem
      ? {
          title: existingItem.title,
          description: existingItem.description ?? "",
          period: existingItem.period,
          time: existingItem.time ?? "",
          date: existingItem.date ?? "",
          durationMinutes: existingItem.durationMinutes ?? 10,
          frequency: existingItem.frequency,
          weekdays: existingItem.weekdays ?? [],
          category: existingItem.category,
          priority: existingItem.priority,
          icon: existingItem.icon,
        }
      : emptyForm
  );
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleWeekday(day: number) {
    update("weekdays", form.weekdays.includes(day) ? form.weekdays.filter((d) => d !== day) : [...form.weekdays, day]);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        routineId,
        patientId,
        professionalId,
        title: form.title.trim(),
        description: form.description.trim(),
        period: form.period,
        time: form.time || undefined,
        date: form.frequency === "once" ? form.date || undefined : undefined,
        durationMinutes: form.durationMinutes,
        frequency: form.frequency,
        weekdays: form.weekdays,
        category: form.category,
        priority: form.priority,
        icon: form.icon,
        points: existingItem?.points ?? 10,
        notificationConfig: existingItem?.notificationConfig ?? {
          enabled: true,
          leadMinutes: 15,
          remindersCount: 1,
          repeatIfLate: true,
        },
        order: existingItem?.order ?? Date.now(),
        createdBy: "patient" as const,
      };

      if (existingItem) {
        await updateRoutineItem(existingItem.id, payload, false);
        showToast("Atividade atualizada.");
      } else {
        await createRoutineItem(payload, false);
        showToast("Atividade criada.");
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!existingItem) return;
    await deleteRoutineItem(existingItem.id);
    showToast("Atividade excluída.");
    setConfirmingDelete(false);
    onClose();
  }

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={existingItem ? "Editar sua atividade" : "Nova atividade"}
      footer={
        <div className="flex flex-col gap-2">
          <button className="btn-primary" onClick={handleSave} disabled={saving || !form.title.trim()}>
            {saving ? "Salvando..." : existingItem ? "Salvar alterações" : "Criar atividade"}
          </button>
          {existingItem && (
            <button
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-base font-bold text-rose-500"
              onClick={() => setConfirmingDelete(true)}
            >
              Excluir
            </button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Título da atividade" className="input-field" />
        <textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Descrição (opcional)"
          rows={2}
          className="input-field resize-none"
        />

        <div>
          <p className="mb-1 text-xs font-bold text-brand-500">Ícone</p>
          <div className="flex flex-wrap gap-1.5">
            {ICON_OPTIONS.map((icon) => (
              <button
                key={icon}
                onClick={() => update("icon", icon)}
                className={clsx("flex h-9 w-9 items-center justify-center rounded-xl text-lg", form.icon === icon ? "bg-brand-500" : "bg-brand-50")}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Select label="Período" value={form.period} onChange={(v) => update("period", v as Period)} options={Object.entries(PERIOD_LABELS)} />
          <div>
            <p className="mb-1 text-xs font-bold text-brand-500">Horário</p>
            <input type="time" value={form.time} onChange={(e) => update("time", e.target.value)} className="input-field" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Select label="Categoria" value={form.category} onChange={(v) => update("category", v as ActivityCategory)} options={Object.entries(CATEGORY_LABELS)} />
          <Select
            label="Prioridade"
            value={form.priority}
            onChange={(v) => update("priority", v as Priority)}
            options={PRIORITY_ORDER.map((p): [string, string] => [p, PRIORITY_LABELS[p]])}
          />
        </div>

        <Select
          label="Frequência"
          value={form.frequency}
          onChange={(v) => update("frequency", v as RoutineItemDoc["frequency"])}
          options={[
            ["daily", "Todos os dias"],
            ["weekly", "Dias específicos da semana"],
            ["custom_days", "Dias específicos (personalizado)"],
            ["once", "Uma única vez"],
          ]}
        />

        {(form.frequency === "weekly" || form.frequency === "custom_days") && (
          <div className="flex gap-1.5">
            {WEEKDAY_LABELS.map((label, index) => (
              <button
                key={label}
                onClick={() => toggleWeekday(index)}
                className={clsx(
                  "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold",
                  form.weekdays.includes(index) ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-500"
                )}
              >
                {label[0]}
              </button>
            ))}
          </div>
        )}

        {form.frequency === "once" && (
          <div>
            <p className="mb-1 text-xs font-bold text-brand-500">Data</p>
            <input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} className="input-field" />
          </div>
        )}

        <div>
          <p className="mb-1 text-xs font-bold text-brand-500">Duração (min)</p>
          <input
            type="number"
            min={1}
            value={form.durationMinutes}
            onChange={(e) => update("durationMinutes", Number(e.target.value))}
            className="input-field"
          />
        </div>

      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title="Excluir esta atividade?"
        description="Ela vai deixar de aparecer na sua rotina."
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </BottomSheet>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-bold text-brand-500">{label}</p>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input-field">
        {options.map(([key, opt]) => (
          <option key={key} value={key}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
