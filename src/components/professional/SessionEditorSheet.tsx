import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/common/BottomSheet";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";
import { subscribeToLinkedPatients } from "@/services/patients";
import { getPatientsOverview } from "@/services/professionalOverview";
import { createRecurringSessions, createSession, deleteSession, updateSession } from "@/services/sessions";
import { subscribeToPartners, subscribeToRoomSlots } from "@/services/room";
import { checkRoom, type RoomCheck } from "@/utils/roomAvailability";
import { RoomConflictDialog } from "./RoomConflictDialog";
import type { PaymentStatus, RoomPartnerDoc, RoomSlotDoc, SessionDoc, SessionModality } from "@/types";

interface SessionEditorSheetProps {
  professionalId: string;
  existing?: SessionDoc;
  defaultDate: string;
  ownerName: string;
  onClose: () => void;
}

const emptyForm = {
  patientId: "",
  date: "",
  startTime: "09:00",
  endTime: "09:50",
  modality: "in_person" as SessionModality,
  price: "",
  paymentStatus: "pending" as PaymentStatus,
  note: "",
  repeat: "none" as "none" | "weekly" | "biweekly",
  repeatWeeks: 8,
};

export function SessionEditorSheet({ professionalId, existing, defaultDate, ownerName, onClose }: SessionEditorSheetProps) {
  const { showToast } = useToast();
  const [patients, setPatients] = useState<Array<{ id: string; name: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [partners, setPartners] = useState<RoomPartnerDoc[]>([]);
  const [slots, setSlots] = useState<RoomSlotDoc[]>([]);
  const [conflito, setConflito] = useState<RoomCheck | null>(null);
  const [form, setForm] = useState(() =>
    existing
      ? {
          patientId: existing.patientId,
          date: existing.date,
          startTime: existing.startTime,
          endTime: existing.endTime,
          modality: existing.modality,
          price: existing.price != null ? String(existing.price) : "",
          paymentStatus: existing.paymentStatus,
          note: existing.note ?? "",
          repeat: "none" as const,
          repeatWeeks: 8,
        }
      : { ...emptyForm, date: defaultDate }
  );

  useEffect(() => {
    return subscribeToLinkedPatients(professionalId, async (links) => {
      const overview = await getPatientsOverview(links.map((l) => l.patientId));
      setPatients(overview.map((o) => ({ id: o.patientId, name: o.name })));
    });
  }, [professionalId]);

  useEffect(() => subscribeToPartners(professionalId, setPartners), [professionalId]);
  useEffect(() => subscribeToRoomSlots(professionalId, setSlots), [professionalId]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // O fim acompanha o início na primeira escolha, mantendo os 50 minutos habituais.
  function handleStartChange(value: string) {
    const [h, m] = value.split(":").map(Number);
    const end = new Date(2000, 0, 1, h, (m || 0) + 50);
    setForm((prev) => ({
      ...prev,
      startTime: value,
      endTime: `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`,
    }));
  }

  /** Confere a sala antes de gravar; se estiver fora do turno dela, pede confirmação. */
  function handleSave() {
    const check = checkRoom(form.date, form.startTime, form.endTime, slots, partners);
    if (check.status === "taken" || check.status === "free") {
      setConflito(check);
      return;
    }
    persist();
  }

  async function persist() {
    setConflito(null);
    const patient = patients.find((p) => p.id === form.patientId);
    if (!patient || !form.date) return;

    setSaving(true);
    try {
      const payload = {
        professionalId,
        patientId: patient.id,
        patientName: patient.name,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        modality: form.modality,
        status: existing?.status ?? ("scheduled" as const),
        price: form.price ? Number(form.price.replace(",", ".")) : undefined,
        paymentStatus: form.paymentStatus,
        note: form.note.trim(),
      };

      if (existing) {
        await updateSession(existing.id, payload);
        showToast("Sessão atualizada.");
      } else if (form.repeat === "none") {
        await createSession(payload);
        showToast("Sessão agendada.");
      } else {
        const created = await createRecurringSessions(payload, form.repeatWeeks, form.repeat === "biweekly");
        showToast(`${created.length} sessões agendadas.`);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!existing) return;
    await deleteSession(existing.id);
    showToast("Sessão removida.");
    onClose();
  }

  const canSave = !!form.patientId && !!form.date && form.startTime < form.endTime;

  return (
    <BottomSheet open onClose={onClose} title={existing ? "Editar sessão" : "Nova sessão"}>
      <div className="flex flex-col gap-3">
        <Field label="Paciente">
          <select
            value={form.patientId}
            onChange={(e) => update("patientId", e.target.value)}
            className="input-field"
            disabled={!!existing}
          >
            <option value="">Selecione...</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Data">
          <input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} className="input-field" />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Início">
            <input type="time" value={form.startTime} onChange={(e) => handleStartChange(e.target.value)} className="input-field" />
          </Field>
          <Field label="Fim">
            <input type="time" value={form.endTime} onChange={(e) => update("endTime", e.target.value)} className="input-field" />
          </Field>
        </div>

        <Field label="Modalidade">
          <div className="flex gap-2">
            <Toggle active={form.modality === "in_person"} onClick={() => update("modality", "in_person")}>
              Presencial
            </Toggle>
            <Toggle active={form.modality === "online"} onClick={() => update("modality", "online")}>
              Online
            </Toggle>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Valor (R$)">
            <input
              type="text"
              inputMode="decimal"
              placeholder="150,00"
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
              className="input-field"
            />
          </Field>
          <Field label="Pagamento">
            <select
              value={form.paymentStatus}
              onChange={(e) => update("paymentStatus", e.target.value as PaymentStatus)}
              className="input-field"
            >
              <option value="pending">A pagar</option>
              <option value="paid">Pago</option>
              <option value="exempt">Isento</option>
            </select>
          </Field>
        </div>

        {!existing && (
          <Field label="Repetir">
            <div className="flex gap-2">
              <Toggle active={form.repeat === "none"} onClick={() => update("repeat", "none")}>
                Não
              </Toggle>
              <Toggle active={form.repeat === "weekly"} onClick={() => update("repeat", "weekly")}>
                Semanal
              </Toggle>
              <Toggle active={form.repeat === "biweekly"} onClick={() => update("repeat", "biweekly")}>
                Quinzenal
              </Toggle>
            </div>
            {form.repeat !== "none" && (
              <p className="mt-2 text-xs text-brand-500">
                Serão criadas{" "}
                <select
                  value={form.repeatWeeks}
                  onChange={(e) => update("repeatWeeks", Number(e.target.value))}
                  className="rounded-lg border border-brand-200 px-1.5 py-0.5 font-bold text-brand-700"
                >
                  {[4, 8, 12, 24].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>{" "}
                sessões, uma a cada {form.repeat === "weekly" ? "semana" : "duas semanas"}.
              </p>
            )}
          </Field>
        )}

        <Field label="Observação da agenda (opcional)">
          <textarea
            value={form.note}
            onChange={(e) => update("note", e.target.value)}
            rows={2}
            placeholder="Combinado, lembrete, particularidade do dia..."
            className="input-field resize-none"
          />
          <p className="mt-1 text-xs text-brand-400">
            Isto não é prontuário — o registro clínico fica na própria sessão, depois de realizada.
          </p>
        </Field>

        <button className="btn-primary" onClick={handleSave} disabled={!canSave || saving}>
          {saving ? "Salvando..." : existing ? "Salvar alterações" : "Agendar"}
        </button>

        {existing && (
          <button onClick={() => setConfirmingDelete(true)} className="text-sm font-bold text-rose-500">
            Remover sessão
          </button>
        )}
      </div>

      {conflito && (
        <RoomConflictDialog
          check={conflito}
          professionalId={professionalId}
          ownerName={ownerName}
          date={form.date}
          startTime={form.startTime}
          endTime={form.endTime}
          onConfirm={persist}
          onCancel={() => setConflito(null)}
        />
      )}

      <ConfirmDialog
        open={confirmingDelete}
        title="Remover esta sessão?"
        description="A sessão sai da agenda. O registro clínico já escrito, se houver, continua guardado no prontuário."
        confirmLabel="Remover"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </BottomSheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-bold text-brand-500">{label}</p>
      {children}
    </div>
  );
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "flex-1 rounded-xl bg-brand-500 px-3 py-2 text-sm font-bold text-white"
          : "flex-1 rounded-xl bg-brand-50 px-3 py-2 text-sm font-bold text-brand-500"
      }
    >
      {children}
    </button>
  );
}
