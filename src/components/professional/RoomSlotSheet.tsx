import { useState } from "react";
import clsx from "clsx";
import { BottomSheet } from "@/components/common/BottomSheet";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";
import { createSlotsForWeekdays, deleteSlot, updateSlot } from "@/services/room";
import type { RoomPartnerDoc, RoomSlotDoc } from "@/types";
import { WEEKDAY_ORDER, WEEKDAY_SHORT } from "@/utils/agenda";

export function RoomSlotSheet({
  professionalId,
  partners,
  existing,
  onClose,
}: {
  professionalId: string;
  partners: RoomPartnerDoc[];
  existing?: RoomSlotDoc;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [partnerId, setPartnerId] = useState(existing?.partnerId ?? partners[0]?.id ?? "");
  const [weekdays, setWeekdays] = useState<number[]>(existing ? [existing.weekday] : []);
  const [startTime, setStartTime] = useState(existing?.startTime ?? "08:00");
  const [endTime, setEndTime] = useState(existing?.endTime ?? "12:00");
  const [room, setRoom] = useState(existing?.room ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function toggleWeekday(wd: number) {
    setWeekdays((prev) => (prev.includes(wd) ? prev.filter((d) => d !== wd) : [...prev, wd]));
  }

  async function handleSave() {
    const partner = partners.find((p) => p.id === partnerId);
    if (!partner || weekdays.length === 0 || startTime >= endTime) return;

    setSaving(true);
    try {
      const base = {
        professionalId,
        partnerId: partner.id,
        partnerName: partner.name,
        startTime,
        endTime,
        room: room.trim(),
        note: note.trim(),
        active: true,
      };

      if (existing) {
        await updateSlot(existing.id, { ...base, weekday: weekdays[0] });
        showToast("Horário atualizado.");
      } else {
        const criados = await createSlotsForWeekdays(base, weekdays);
        showToast(criados.length === 1 ? "Horário adicionado." : `${criados.length} horários adicionados.`);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!existing) return;
    await deleteSlot(existing.id);
    showToast("Horário removido.");
    onClose();
  }

  const podeSalvar = !!partnerId && weekdays.length > 0 && startTime < endTime;

  return (
    <BottomSheet open onClose={onClose} title={existing ? "Editar horário da sala" : "Novo horário na sala"}>
      <div className="flex flex-col gap-3">
        <div>
          <p className="mb-1 text-xs font-bold text-brand-500">Profissional</p>
          <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} className="input-field">
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.profession ? ` — ${p.profession}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="mb-1 text-xs font-bold text-brand-500">
            {existing ? "Dia da semana" : "Dias da semana"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAY_ORDER.map((wd) => (
              <button
                key={wd}
                type="button"
                onClick={() => (existing ? setWeekdays([wd]) : toggleWeekday(wd))}
                className={clsx(
                  "rounded-xl px-3 py-2 text-xs font-bold",
                  weekdays.includes(wd) ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-500"
                )}
              >
                {WEEKDAY_SHORT[wd]}
              </button>
            ))}
          </div>
          {!existing && (
            <p className="mt-1.5 text-xs text-brand-400">
              Escolha vários dias para criar o mesmo horário de uma vez.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 text-xs font-bold text-brand-500">Início</p>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input-field" />
          </div>
          <div>
            <p className="mb-1 text-xs font-bold text-brand-500">Fim</p>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input-field" />
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-bold text-brand-500">Sala (opcional)</p>
          <input
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="Sala 1, consultório dos fundos..."
            className="input-field"
          />
        </div>

        <div>
          <p className="mb-1 text-xs font-bold text-brand-500">Observação (opcional)</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Combinado de limpeza, chave, troca pontual..."
            className="input-field resize-none"
          />
        </div>

        <button className="btn-primary" onClick={handleSave} disabled={!podeSalvar || saving}>
          {saving ? "Salvando..." : existing ? "Salvar" : "Adicionar à escala"}
        </button>

        {existing && (
          <button onClick={() => setConfirmingDelete(true)} className="text-sm font-bold text-rose-500">
            Remover horário
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title="Remover este horário?"
        description="O horário sai da escala da sala. Os demais dias desse profissional continuam."
        confirmLabel="Remover"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </BottomSheet>
  );
}
