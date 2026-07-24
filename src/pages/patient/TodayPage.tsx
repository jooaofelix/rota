import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToPatient } from "@/services/patients";
import { subscribeToRoutineItems } from "@/services/routines";
import { subscribeToCompletionsForDate } from "@/services/completions";
import { subscribeToPatientRewards } from "@/services/rewards";
import { subscribeToPatientMessages } from "@/services/messages";
import type { CompletionDoc, MessageDoc, PatientDoc, RewardDoc, RoutineItemDoc } from "@/types";
import { ActivityCard } from "@/components/patient/ActivityCard";
import { ActivityActionSheet } from "@/components/patient/ActivityActionSheet";
import { ProgressRing } from "@/components/common/ProgressRing";
import { EmptyState } from "@/components/common/EmptyState";
import { NotificationsBell } from "@/components/common/NotificationsBell";
import { formatFriendlyDate, todayKey } from "@/utils/date";
import { getTodayStatus, isScheduledOn, sortByPeriodAndTime } from "@/utils/schedule";
import { PERIOD_LABELS } from "@/utils/constants";

export function TodayPage() {
  const { firebaseUser, userDoc } = useAuth();
  const patientId = firebaseUser?.uid;

  const [patient, setPatient] = useState<PatientDoc | null>(null);
  const [items, setItems] = useState<RoutineItemDoc[]>([]);
  const [completions, setCompletions] = useState<CompletionDoc[]>([]);
  const [rewards, setRewards] = useState<RewardDoc[]>([]);
  const [messages, setMessages] = useState<MessageDoc[]>([]);
  const [activeItem, setActiveItem] = useState<RoutineItemDoc | null>(null);

  useEffect(() => {
    if (!patientId) return;
    const unsub = [
      subscribeToPatient(patientId, setPatient),
      subscribeToRoutineItems(patientId, setItems),
      subscribeToCompletionsForDate(patientId, todayKey(), setCompletions),
      subscribeToPatientRewards(patientId, setRewards),
      subscribeToPatientMessages(patientId, setMessages),
    ];
    return () => unsub.forEach((u) => u());
  }, [patientId]);

  const todayItems = useMemo(() => sortByPeriodAndTime(items.filter((i) => isScheduledOn(i))), [items]);

  const completionByItemId = useMemo(() => {
    const map = new Map<string, CompletionDoc>();
    completions.forEach((c) => map.set(c.routineItemId, c));
    return map;
  }, [completions]);

  const withStatus = todayItems.map((item) => ({ item, status: getTodayStatus(item, completionByItemId.get(item.id)) }));
  const completedCount = withStatus.filter((w) => w.status === "completed").length;
  const pendingList = withStatus.filter((w) => w.status === "pending" || w.status === "late");
  const nextActivity = pendingList[0];
  const progressPercent = withStatus.length ? Math.round((completedCount / withStatus.length) * 100) : 0;

  const nextReward = useMemo(() => {
    if (!patient) return null;
    return rewards
      .filter((r) => r.status === "available" && r.pointsRequired)
      .sort((a, b) => (a.pointsRequired ?? 0) - (b.pointsRequired ?? 0))
      .find((r) => (r.pointsRequired ?? 0) > patient.points);
  }, [rewards, patient]);

  const unreadMessages = messages.filter((m) => !m.read);

  return (
    <div className="px-4 pt-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-brand-400">Olá, {userDoc?.name?.split(" ")[0] ?? "tudo bem"}! 👋</p>
          <p className="text-sm capitalize text-brand-400">{formatFriendlyDate()}</p>
        </div>
        {patientId && <NotificationsBell userId={patientId} />}
      </div>

      <div className="card mt-3 flex items-center gap-4">
        <ProgressRing percent={progressPercent} size={90} strokeWidth={9} />
        <div>
          <p className="text-sm font-bold text-brand-800">Progresso de hoje</p>
          <p className="text-sm text-brand-400">
            {completedCount} de {withStatus.length} atividades concluídas
          </p>
          {patient && (
            <p className="mt-1 text-xs font-bold text-brand-500">
              ⭐ {patient.points} pontos · 🔥 {patient.currentStreak} dias seguidos
            </p>
          )}
        </div>
      </div>

      {unreadMessages.length > 0 && (
        <div className="card mt-3 border-2 border-brand-200 bg-brand-50">
          <p className="text-xs font-bold uppercase text-brand-400">Mensagem da sua profissional</p>
          <p className="mt-1 text-sm text-brand-800">{unreadMessages[0].text}</p>
        </div>
      )}

      {nextActivity ? (
        <div className="mt-4">
          <p className="mb-1.5 text-sm font-bold text-brand-700">O que fazer agora</p>
          <ActivityCard item={nextActivity.item} status={nextActivity.status} onOpen={() => setActiveItem(nextActivity.item)} />
        </div>
      ) : withStatus.length > 0 ? (
        <div className="card mt-4 text-center">
          <p className="text-3xl">🎉</p>
          <p className="mt-1 font-bold text-brand-700">Você concluiu tudo por hoje!</p>
          <p className="text-sm text-brand-400">Muito bem. Aproveite o resto do seu dia.</p>
        </div>
      ) : null}

      {nextReward && (
        <div className="card mt-4 flex items-center gap-3">
          <span className="text-2xl">{nextReward.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-brand-800">Próxima recompensa: {nextReward.name}</p>
            <p className="text-xs text-brand-400">
              Faltam {Math.max(0, (nextReward.pointsRequired ?? 0) - (patient?.points ?? 0))} pontos
            </p>
          </div>
        </div>
      )}

      {withStatus.length > 0 && (
        <div className="mt-5">
          <p className="mb-1.5 text-sm font-bold text-brand-700">Sua rotina de hoje</p>
          <div className="flex flex-col gap-2">
            {(["morning", "afternoon", "evening"] as const).map((period) => {
              const periodItems = withStatus.filter((w) => w.item.period === period);
              if (!periodItems.length) return null;
              return (
                <div key={period}>
                  <p className="mb-1 mt-2 text-xs font-bold uppercase tracking-wide text-brand-300">{PERIOD_LABELS[period]}</p>
                  <div className="flex flex-col gap-2">
                    {periodItems.map(({ item, status }) => (
                      <ActivityCard key={item.id} item={item} status={status} onOpen={() => setActiveItem(item)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {withStatus.length === 0 && (
        <EmptyState icon="🌱" title="Nenhuma atividade para hoje" description="Sua profissional ainda não adicionou atividades para hoje." />
      )}

      {activeItem && <ActivityActionSheet item={activeItem} onClose={() => setActiveItem(null)} />}
    </div>
  );
}
