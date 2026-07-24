import { onSchedule } from "firebase-functions/v2/scheduler";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../admin";
import { sendOnce } from "../dedupe";
import { isScheduledOn, todayKey } from "../utils/schedule";
import type { CompletionDoc, RoutineItemDoc } from "../types";

function minutesDiff(now: Date, target: Date): number {
  return Math.round((target.getTime() - now.getTime()) / 60000);
}

async function createNotification(recipientId: string, type: string, title: string, body: string, routineItemId?: string, url = "/rotina") {
  await db.collection("notifications").add({
    recipientId,
    type,
    title,
    body,
    routineItemId,
    url,
    read: false,
    sentAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Roda a cada 10 minutos: verifica atividades com horário definido e envia lembretes de
 * aproximação, do horário exato e de atraso, respeitando a configuração de cada atividade.
 */
export const routineReminders = onSchedule({ schedule: "every 10 minutes", timeZone: "America/Sao_Paulo" }, async () => {
  const now = new Date();
  const dateKey = todayKey(now);

  const itemsSnap = await db.collection("routineItems").where("active", "==", true).get();
  const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as RoutineItemDoc)).filter((i) => i.time && i.notificationConfig?.enabled);

  for (const item of items) {
    if (!isScheduledOn(item, now)) continue;

    const [hours, minutes] = item.time!.split(":").map(Number);
    const scheduled = new Date(now);
    scheduled.setHours(hours, minutes, 0, 0);

    const leadMinutes = item.notificationConfig?.leadMinutes ?? 15;
    const diff = minutesDiff(now, scheduled);

    if (diff <= leadMinutes && diff > leadMinutes - 10) {
      await sendOnce(`upcoming_${item.id}_${dateKey}`, () =>
        createNotification(item.patientId, "activity_upcoming", "Sua atividade está chegando", `"${item.title}" começa em breve.`, item.id)
      );
      continue;
    }

    if (diff <= 0 && diff > -10) {
      await sendOnce(`due_${item.id}_${dateKey}`, () =>
        createNotification(item.patientId, "activity_due", "Está na hora!", `Hora de "${item.title}".`, item.id)
      );
      continue;
    }

    if (diff <= -15) {
      const completionSnap = await db
        .collection("completions")
        .where("routineItemId", "==", item.id)
        .where("date", "==", dateKey)
        .limit(1)
        .get();
      const alreadyHandled = !completionSnap.empty;
      if (alreadyHandled) continue;

      const hourBucket = item.notificationConfig?.repeatIfLate ? `_${now.getHours()}` : "";
      await sendOnce(`late_${item.id}_${dateKey}${hourBucket}`, () =>
        createNotification(item.patientId, "activity_late", "Atividade pendente", `"${item.title}" ainda não foi registrada. Sem problemas, você ainda pode fazer.`, item.id)
      );
    }
  }
});

/** Resumo diário à noite: quantas atividades foram concluídas e quantas ficaram pendentes. */
export const dailySummary = onSchedule({ schedule: "0 20 * * *", timeZone: "America/Sao_Paulo" }, async () => {
  const now = new Date();
  const dateKey = todayKey(now);

  const patientsSnap = await db.collection("patients").where("active", "==", true).get();

  for (const patientDoc of patientsSnap.docs) {
    const patientId = patientDoc.id;
    const itemsSnap = await db.collection("routineItems").where("patientId", "==", patientId).where("active", "==", true).get();
    const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as RoutineItemDoc)).filter((i) => isScheduledOn(i, now));
    if (items.length === 0) continue;

    const completionsSnap = await db.collection("completions").where("patientId", "==", patientId).where("date", "==", dateKey).get();
    const completions = completionsSnap.docs.map((d) => d.data() as CompletionDoc);
    const completed = completions.filter((c) => c.status === "completed").length;
    const pending = items.length - completions.length;

    await sendOnce(`daily_summary_${patientId}_${dateKey}`, () =>
      createNotification(
        patientId,
        "daily_summary",
        "Resumo do seu dia",
        pending > 0
          ? `Você concluiu ${completed} de ${items.length} atividades hoje. Ainda dá tempo de continuar!`
          : `Você concluiu ${completed} de ${items.length} atividades hoje. Muito bem!`,
        undefined,
        "/hoje"
      )
    );
  }
});
