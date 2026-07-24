import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToPatient } from "@/services/patients";
import { subscribeToAchievements, subscribeToPatientRewards } from "@/services/rewards";
import type { PatientDoc, RewardAchievementDoc, RewardDoc } from "@/types";
import { TopBar } from "@/components/common/TopBar";
import { ProgressRing } from "@/components/common/ProgressRing";
import { EmptyState } from "@/components/common/EmptyState";
import { pointsToNextLevel } from "@/utils/points";

export function RewardsPage() {
  const { firebaseUser } = useAuth();
  const patientId = firebaseUser?.uid;
  const [patient, setPatient] = useState<PatientDoc | null>(null);
  const [rewards, setRewards] = useState<RewardDoc[]>([]);
  const [achievements, setAchievements] = useState<RewardAchievementDoc[]>([]);

  useEffect(() => {
    if (!patientId) return;
    const unsub = [
      subscribeToPatient(patientId, setPatient),
      subscribeToPatientRewards(patientId, setRewards),
      subscribeToAchievements(patientId, setAchievements),
    ];
    return () => unsub.forEach((u) => u());
  }, [patientId]);

  const levelInfo = patient ? pointsToNextLevel(patient.points) : null;
  const availableRewards = rewards.filter((r) => r.status === "available");

  return (
    <div>
      <TopBar title="Recompensas" subtitle="Continue conquistando conquistas" />

      <div className="px-4">
        <div className="card flex items-center gap-4">
          <ProgressRing percent={levelInfo?.percent ?? 0} size={90} strokeWidth={9} label={`Nv. ${patient?.level ?? 1}`} />
          <div>
            <p className="text-sm font-bold text-brand-800">⭐ {patient?.points ?? 0} pontos</p>
            <p className="text-sm text-brand-400">🔥 {patient?.currentStreak ?? 0} dias seguidos</p>
            <p className="text-xs text-brand-300">Recorde: {patient?.longestStreak ?? 0} dias</p>
          </div>
        </div>

        <p className="mb-2 mt-5 text-sm font-bold text-brand-700">Suas conquistas</p>
        {achievements.length === 0 ? (
          <EmptyState icon="🏅" title="Ainda sem conquistas" description="Continue realizando sua rotina para desbloquear medalhas." />
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {achievements.map((a) => (
              <div key={a.id} className="card flex flex-col items-center gap-1 py-3">
                <span className="text-3xl">{a.icon}</span>
                <span className="text-center text-[11px] font-bold text-brand-700">{a.rewardName}</span>
              </div>
            ))}
          </div>
        )}

        <p className="mb-2 mt-5 text-sm font-bold text-brand-700">Recompensas disponíveis</p>
        {availableRewards.length === 0 ? (
          <EmptyState icon="🎁" title="Nenhuma recompensa no momento" description="Sua profissional pode adicionar novas recompensas a qualquer momento." />
        ) : (
          <div className="flex flex-col gap-2 pb-4">
            {availableRewards.map((r) => (
              <div key={r.id} className="card flex items-center gap-3">
                <span className="text-2xl">{r.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-brand-800">{r.name}</p>
                  {r.description && <p className="truncate text-xs text-brand-400">{r.description}</p>}
                  {r.incentiveMessage && <p className="mt-0.5 text-xs italic text-brand-500">{r.incentiveMessage}</p>}
                </div>
                {r.pointsRequired ? (
                  <span className="shrink-0 text-xs font-bold text-brand-500">{r.pointsRequired} pts</span>
                ) : (
                  <span className="shrink-0 text-xs font-bold text-brand-500">🎁</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
