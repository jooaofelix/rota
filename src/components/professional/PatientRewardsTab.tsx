import { useEffect, useState } from "react";
import { subscribeToAchievements, subscribeToPatientRewards, createManualReward, deliverRewardDirectly } from "@/services/rewards";
import type { RewardAchievementDoc, RewardDoc } from "@/types";
import { BottomSheet } from "@/components/common/BottomSheet";
import { EmptyState } from "@/components/common/EmptyState";
import { ICON_OPTIONS } from "@/utils/constants";
import { useToast } from "@/contexts/ToastContext";
import clsx from "clsx";

export function PatientRewardsTab({ patientId, professionalId }: { patientId: string; professionalId: string }) {
  const { showToast } = useToast();
  const [rewards, setRewards] = useState<RewardDoc[]>([]);
  const [achievements, setAchievements] = useState<RewardAchievementDoc[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", icon: "🎁", pointsRequired: "", incentiveMessage: "", requiresApproval: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = [
      subscribeToPatientRewards(patientId, setRewards),
      subscribeToAchievements(patientId, setAchievements),
    ];
    return () => unsub.forEach((u) => u());
  }, [patientId]);

  async function handleCreate() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await createManualReward(professionalId, patientId, {
        name: form.name.trim(),
        description: form.description.trim(),
        icon: form.icon,
        pointsRequired: form.pointsRequired ? Number(form.pointsRequired) : undefined,
        incentiveMessage: form.incentiveMessage.trim(),
        requiresApproval: form.requiresApproval,
      });
      showToast("Recompensa criada!");
      setCreating(false);
      setForm({ name: "", description: "", icon: "🎁", pointsRequired: "", incentiveMessage: "", requiresApproval: false });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeliver(reward: RewardDoc) {
    await deliverRewardDirectly(professionalId, patientId, reward);
    showToast(`Recompensa "${reward.name}" entregue!`);
  }

  const available = rewards.filter((r) => r.status === "available");

  return (
    <div className="flex flex-col gap-4">
      <button className="btn-primary" onClick={() => setCreating(true)}>
        + Nova recompensa
      </button>

      <div>
        <p className="mb-2 text-sm font-bold text-brand-700">Conquistas do paciente</p>
        {achievements.length === 0 ? (
          <EmptyState icon="🏅" title="Nenhuma conquista ainda" />
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {achievements.map((a) => (
              <div key={a.id} className="card items-center py-3 text-center">
                <span className="text-2xl">{a.icon}</span>
                <span className="text-[11px] font-bold text-brand-700">{a.rewardName}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-brand-700">Recompensas disponíveis</p>
        {available.length === 0 ? (
          <EmptyState icon="🎁" title="Nenhuma recompensa cadastrada" />
        ) : (
          <div className="flex flex-col gap-2">
            {available.map((r) => (
              <div key={r.id} className="card flex items-center gap-3">
                <span className="text-2xl">{r.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-brand-800">{r.name}</p>
                  <p className="truncate text-xs text-brand-400">{r.pointsRequired ? `${r.pointsRequired} pontos` : "Entrega manual"}</p>
                </div>
                <button onClick={() => handleDeliver(r)} className="shrink-0 rounded-full bg-brand-500 px-3 py-1.5 text-xs font-bold text-white">
                  Entregar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomSheet open={creating} onClose={() => setCreating(false)} title="Nova recompensa">
        <div className="flex flex-col gap-3">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Nome da recompensa"
            className="input-field"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
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
                  onClick={() => setForm((f) => ({ ...f, icon }))}
                  className={clsx("flex h-9 w-9 items-center justify-center rounded-xl text-lg", form.icon === icon ? "bg-brand-500" : "bg-brand-50")}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <input
            type="number"
            min={0}
            value={form.pointsRequired}
            onChange={(e) => setForm((f) => ({ ...f, pointsRequired: e.target.value }))}
            placeholder="Pontos necessários (opcional)"
            className="input-field"
          />
          <input
            value={form.incentiveMessage}
            onChange={(e) => setForm((f) => ({ ...f, incentiveMessage: e.target.value }))}
            placeholder="Mensagem de incentivo (opcional)"
            className="input-field"
          />
          <label className="flex items-center justify-between text-sm font-semibold text-brand-700">
            Precisa da minha aprovação para ser resgatada
            <input
              type="checkbox"
              checked={form.requiresApproval}
              onChange={(e) => setForm((f) => ({ ...f, requiresApproval: e.target.checked }))}
              className="h-5 w-5 rounded border-brand-300"
            />
          </label>
          <button className="btn-primary" onClick={handleCreate} disabled={saving || !form.name.trim()}>
            {saving ? "Salvando..." : "Criar recompensa"}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
