import { onSchedule } from "firebase-functions/v2/scheduler";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../admin";
import { sendOnce } from "../dedupe";
import { isScheduledOn, todayKey } from "../utils/schedule";
import type { Period, RoutineItemDoc } from "../types";

async function notifyPeriodStart(period: Period, label: string, emoji: string) {
  const now = new Date();
  const dateKey = todayKey(now);

  const itemsSnap = await db.collection("routineItems").where("active", "==", true).where("period", "==", period).get();
  const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as RoutineItemDoc)).filter((i) => isScheduledOn(i, now));

  const patientIds = Array.from(new Set(items.map((i) => i.patientId)));

  for (const patientId of patientIds) {
    await sendOnce(`period_${period}_${patientId}_${dateKey}`, async () => {
      await db.collection("notifications").add({
        recipientId: patientId,
        type: `period_${period}`,
        title: `${emoji} Rotina da ${label}`,
        body: `Confira as atividades da ${label} na sua rotina de hoje.`,
        url: "/hoje",
        read: false,
        sentAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      });
    });
  }
}

export const morningSummary = onSchedule({ schedule: "30 7 * * *", timeZone: "America/Sao_Paulo" }, async () => {
  await notifyPeriodStart("morning", "manhã", "🌅");
});

export const afternoonSummary = onSchedule({ schedule: "30 12 * * *", timeZone: "America/Sao_Paulo" }, async () => {
  await notifyPeriodStart("afternoon", "tarde", "☀️");
});

export const eveningSummary = onSchedule({ schedule: "30 18 * * *", timeZone: "America/Sao_Paulo" }, async () => {
  await notifyPeriodStart("evening", "noite", "🌙");
});
