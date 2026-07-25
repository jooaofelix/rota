import { collection, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { CompletionDoc, PatientDoc, Period, RoutineItemDoc } from "@/types";
import { levelFromPoints } from "@/utils/points";
import { todayKey } from "@/utils/date";
import { isScheduledOn } from "@/utils/schedule";

/**
 * Motor de pontos, sequência (streak) e conquistas automáticas — roda no cliente do
 * próprio paciente (ele só altera os próprios dados, permitido pelas regras do Firestore).
 *
 * Isso existe porque Cloud Functions exigem o plano pago (Blaze) do Firebase. Quando o
 * projeto tiver Blaze, a Cloud Function `onCompletionCreate` pode assumir esse cálculo de
 * forma mais confiável (o paciente não deveria, em teoria, conseguir alterar a própria
 * pontuação) — mas para o uso do ROTA (gamificação de acompanhamento, não uma moeda de
 * valor real) esse é um custo aceitável em troca de não precisar de faturamento.
 */

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

function yesterdayKey(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

async function awardAchievementOnce(patientId: string, achievementId: string, rewardName: string, icon: string): Promise<void> {
  const ref = doc(db, "rewardAchievements", achievementId);
  const existing = await getDoc(ref);
  if (existing.exists()) return;

  await setDoc(ref, {
    patientId,
    rewardId: achievementId,
    rewardName,
    icon,
    awardedBy: "system",
    pendingApproval: false,
    achievedAt: serverTimestamp(),
  });

  await setDoc(doc(collection(db, "notifications")), {
    recipientId: patientId,
    type: "reward_achieved",
    title: "Recompensa conquistada!",
    body: `Parabéns! Você conquistou: ${rewardName}`,
    url: "/recompensas",
    read: false,
    sentAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
}

/** Atualiza pontos, nível e sequência de dias do paciente após uma conclusão, e verifica conquistas. */
export async function applyCompletionRewards(
  routineItem: RoutineItemDoc,
  status: "completed" | "partial",
  pointsAwarded: number,
  date: string
): Promise<void> {
  const patientRef = doc(db, "patients", routineItem.patientId);
  let newStreak = 0;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(patientRef);
    const data = (snap.exists() ? snap.data() : {}) as Partial<PatientDoc>;

    const newPoints = (data.points ?? 0) + pointsAwarded;
    let currentStreak = data.currentStreak ?? 0;
    let longestStreak = data.longestStreak ?? 0;
    let lastActivityDate = data.lastActivityDate;

    if (status === "completed") {
      if (lastActivityDate === date) {
        // já tinha uma atividade concluída hoje, mantém o streak
      } else if (lastActivityDate === yesterdayKey(date)) {
        currentStreak += 1;
      } else {
        currentStreak = 1;
      }
      longestStreak = Math.max(longestStreak, currentStreak);
      lastActivityDate = date;
    }
    newStreak = currentStreak;

    tx.set(
      patientRef,
      {
        points: newPoints,
        level: levelFromPoints(newPoints),
        currentStreak,
        longestStreak,
        lastActivityDate,
      },
      { merge: true }
    );
  });

  if (status !== "completed") return;

  const firstCompletionSnap = await getDocs(
    query(collection(db, "completions"), where("patientId", "==", routineItem.patientId), where("status", "==", "completed"))
  );
  if (firstCompletionSnap.size <= 1) {
    await awardAchievementOnce(routineItem.patientId, `${routineItem.patientId}_first_completion`, "Primeira atividade concluída", "🌟");
  }

  if (STREAK_MILESTONES.includes(newStreak)) {
    await awardAchievementOnce(routineItem.patientId, `${routineItem.patientId}_streak_${newStreak}`, `Sequência de ${newStreak} dias`, "🔥");
  }

  await checkPeriodComplete(routineItem.patientId, routineItem.period, date);
}

async function checkPeriodComplete(patientId: string, period: Period, date: string): Promise<void> {
  const itemsSnap = await getDocs(
    query(collection(db, "routineItems"), where("patientId", "==", patientId), where("active", "==", true), where("period", "==", period))
  );
  const referenceDate = new Date(`${date}T00:00:00`);
  const periodItems = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as RoutineItemDoc)).filter((i) => isScheduledOn(i, referenceDate));
  if (periodItems.length === 0) return;

  const completionsSnap = await getDocs(
    query(collection(db, "completions"), where("patientId", "==", patientId), where("date", "==", date))
  );
  const completedIds = new Set(
    completionsSnap.docs.map((d) => d.data() as CompletionDoc).filter((c) => c.status === "completed").map((c) => c.routineItemId)
  );
  const allDone = periodItems.every((item) => completedIds.has(item.id));
  if (!allDone) return;

  const periodLabel = period === "morning" ? "manhã" : period === "afternoon" ? "tarde" : "noite";
  await awardAchievementOnce(patientId, `${patientId}_period_${period}_${date}`, `Rotina da ${periodLabel} completa`, "✅");
}
