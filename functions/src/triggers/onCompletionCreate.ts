import { onDocumentWritten } from "firebase-functions/v2/firestore";
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

/**
 * Motor de pontos, sequência (streak) e recompensas automáticas, disparado a cada
 * criação OU atualização de uma conclusão de atividade. Usa onDocumentWritten (não
 * onDocumentCreated) porque o cliente agora grava no máximo um registro de conclusão
 * por atividade por dia (id determinístico), sobrescrevendo-o quando o paciente corrige
 * o status (ex.: de "parcial" para "concluí totalmente") — por isso os pontos são
 * calculados pela diferença entre o valor anterior e o novo, em vez de somar sempre o
 * valor cheio, o que evitaria contar em dobro a mesma conclusão.
 */
export const onCompletionCreate = onDocumentWritten("completions/{completionId}", async (event) => {
  const before = event.data?.before?.exists ? (event.data.before.data() as CompletionDoc) : undefined;
  const after = event.data?.after?.exists ? (event.data.after.data() as CompletionDoc) : undefined;
  if (!after) return; // documento excluído, nada a fazer

  const previousPoints = before && before.status !== "skipped" ? before.pointsAwarded ?? 0 : 0;
  const newPoints = after.status !== "skipped" ? after.pointsAwarded ?? 0 : 0;
  const pointsDelta = newPoints - previousPoints;

  const itemSnap = await db.collection("routineItems").doc(after.routineItemId).get();
  if (!itemSnap.exists) return;
  const item = itemSnap.data() as RoutineItemDoc;

  const patientRef = db.collection("patients").doc(after.patientId);
  const patientSnap = await patientRef.get();
  const patient = (patientSnap.exists ? patientSnap.data() : { points: 0, level: 1, currentStreak: 0, longestStreak: 0 }) as PatientDoc;

  const newTotalPoints = Math.max(0, (patient.points ?? 0) + pointsDelta);

  let currentStreak = patient.currentStreak ?? 0;
  let longestStreak = patient.longestStreak ?? 0;
  let lastActivityDate = patient.lastActivityDate;

  if (after.status === "completed") {
    if (patient.lastActivityDate === after.date) {
      // já tinha atividade concluída hoje, mantém o streak
    } else if (patient.lastActivityDate === yesterdayKey(after.date)) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }
    longestStreak = Math.max(longestStreak, currentStreak);
    lastActivityDate = after.date;
  }

  await patientRef.set(
    {
      points: newTotalPoints,
      level: levelFromPoints(newTotalPoints),
      currentStreak,
      longestStreak,
      lastActivityDate,
    },
    { merge: true }
  );

  if (after.status !== "completed") return;

  // Primeira atividade concluída
  const firstCompletionSnap = await db
    .collection("completions")
    .where("patientId", "==", after.patientId)
    .where("status", "==", "completed")
    .limit(2)
    .get();
  if (firstCompletionSnap.size <= 1) {
    await awardAchievementOnce(after.patientId, `${after.patientId}_first_completion`, "Primeira atividade concluída", "🌟");
  }

  // Marcos de sequência de dias
  if (STREAK_MILESTONES.includes(currentStreak)) {
    await awardAchievementOnce(
      after.patientId,
      `${after.patientId}_streak_${currentStreak}`,
      `Sequência de ${currentStreak} dias`,
      "🔥"
    );
  }

  // Período do dia inteiro concluído
  const date = new Date(`${after.date}T00:00:00`);
  const patientItemsSnap = await db
    .collection("routineItems")
    .where("patientId", "==", after.patientId)
    .where("active", "==", true)
    .where("period", "==", item.period)
    .get();
  const periodItems = patientItemsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as RoutineItemDoc)).filter((i) => isScheduledOn(i, date));

  if (periodItems.length > 0) {
    const periodCompletionsSnap = await db
      .collection("completions")
      .where("patientId", "==", after.patientId)
      .where("date", "==", after.date)
      .get();
    const completedIds = new Set(
      periodCompletionsSnap.docs.map((d) => d.data() as CompletionDoc).filter((c) => c.status === "completed").map((c) => c.routineItemId)
    );
    const allDone = periodItems.every((i) => completedIds.has(i.id));
    if (allDone) {
      const periodLabel = item.period === "morning" ? "manhã" : item.period === "afternoon" ? "tarde" : "noite";
      await awardAchievementOnce(
        after.patientId,
        `${after.patientId}_period_${item.period}_${after.date}`,
        `Rotina da ${periodLabel} completa`,
        "✅"
      );
    }
  }
});
