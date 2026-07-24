import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../admin";
import { isScheduledOn, todayKey } from "../utils/schedule";
import type { CompletionDoc, PatientDoc, RoutineItemDoc } from "../types";

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

function levelFromPoints(points: number): number {
  return Math.max(1, Math.floor(points / 100) + 1);
}

function yesterdayKey(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

async function awardAchievementOnce(patientId: string, achievementId: string, rewardName: string, icon: string) {
  try {
    await db
      .collection("rewardAchievements")
      .doc(achievementId)
      .create({
        patientId,
        rewardId: achievementId,
        rewardName,
        icon,
        awardedBy: "system",
        pendingApproval: false,
        achievedAt: FieldValue.serverTimestamp(),
      });

    await db.collection("notifications").add({
      recipientId: patientId,
      type: "reward_achieved",
      title: "Recompensa conquistada!",
      body: `Parabéns! Você conquistou: ${rewardName}`,
      url: "/recompensas",
      read: false,
      sentAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    // already-exists: conquista já concedida antes, ignora silenciosamente.
  }
}

/** Motor de pontos, sequência (streak) e recompensas automáticas, disparado a cada conclusão de atividade. */
export const onCompletionCreate = onDocumentCreated("completions/{completionId}", async (event) => {
  const completion = event.data?.data() as CompletionDoc | undefined;
  if (!completion || completion.status === "skipped") return;

  const itemSnap = await db.collection("routineItems").doc(completion.routineItemId).get();
  if (!itemSnap.exists) return;
  const item = itemSnap.data() as RoutineItemDoc;

  const patientRef = db.collection("patients").doc(completion.patientId);
  const patientSnap = await patientRef.get();
  const patient = (patientSnap.exists ? patientSnap.data() : { points: 0, level: 1, currentStreak: 0, longestStreak: 0 }) as PatientDoc;

  const pointsAwarded = completion.status === "completed" ? item.points : Math.round(item.points / 2);
  const newPoints = (patient.points ?? 0) + pointsAwarded;

  let currentStreak = patient.currentStreak ?? 0;
  let longestStreak = patient.longestStreak ?? 0;
  let lastActivityDate = patient.lastActivityDate;

  if (completion.status === "completed") {
    if (patient.lastActivityDate === completion.date) {
      // já tinha atividade concluída hoje, mantém o streak
    } else if (patient.lastActivityDate === yesterdayKey(completion.date)) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }
    longestStreak = Math.max(longestStreak, currentStreak);
    lastActivityDate = completion.date;
  }

  await patientRef.set(
    {
      points: newPoints,
      level: levelFromPoints(newPoints),
      currentStreak,
      longestStreak,
      lastActivityDate,
    },
    { merge: true }
  );

  if (completion.status !== "completed") return;

  // Primeira atividade concluída
  const firstCompletionSnap = await db
    .collection("completions")
    .where("patientId", "==", completion.patientId)
    .where("status", "==", "completed")
    .limit(2)
    .get();
  if (firstCompletionSnap.size <= 1) {
    await awardAchievementOnce(completion.patientId, `${completion.patientId}_first_completion`, "Primeira atividade concluída", "🌟");
  }

  // Marcos de sequência de dias
  if (STREAK_MILESTONES.includes(currentStreak)) {
    await awardAchievementOnce(
      completion.patientId,
      `${completion.patientId}_streak_${currentStreak}`,
      `Sequência de ${currentStreak} dias`,
      "🔥"
    );
  }

  // Período do dia inteiro concluído
  const date = new Date(`${completion.date}T00:00:00`);
  const patientItemsSnap = await db
    .collection("routineItems")
    .where("patientId", "==", completion.patientId)
    .where("active", "==", true)
    .where("period", "==", item.period)
    .get();
  const periodItems = patientItemsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as RoutineItemDoc)).filter((i) => isScheduledOn(i, date));

  if (periodItems.length > 0) {
    const periodCompletionsSnap = await db
      .collection("completions")
      .where("patientId", "==", completion.patientId)
      .where("date", "==", completion.date)
      .get();
    const completedIds = new Set(
      periodCompletionsSnap.docs.map((d) => d.data() as CompletionDoc).filter((c) => c.status === "completed").map((c) => c.routineItemId)
    );
    const allDone = periodItems.every((i) => completedIds.has(i.id));
    if (allDone) {
      const periodLabel = item.period === "morning" ? "manhã" : item.period === "afternoon" ? "tarde" : "noite";
      await awardAchievementOnce(
        completion.patientId,
        `${completion.patientId}_period_${item.period}_${completion.date}`,
        `Rotina da ${periodLabel} completa`,
        "✅"
      );
    }
  }
});
