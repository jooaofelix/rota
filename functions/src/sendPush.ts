import { db, messaging } from "./admin";
import type { NotificationType, NotificationPreferences } from "./types";

const PREF_KEY_BY_TYPE: Partial<Record<NotificationType, keyof NotificationPreferences>> = {
  activity_upcoming: "activityUpcoming",
  activity_due: "activityDue",
  activity_late: "activityLate",
  period_morning: "periodSummary",
  period_afternoon: "periodSummary",
  period_evening: "periodSummary",
  new_activity: "newActivity",
  activity_changed: "activityChanged",
  new_message: "newMessage",
  new_reward: "newReward",
  reward_achieved: "rewardAchieved",
  medication_reminder: "medicationReminder",
  daily_summary: "dailySummary",
};

/** Envia um push FCM para todos os dispositivos do usuário, respeitando as preferências dele. */
export async function sendPushToUser(params: {
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
  notificationId?: string;
}) {
  const userSnap = await db.collection("users").doc(params.recipientId).get();
  if (!userSnap.exists) return;
  const user = userSnap.data() as { fcmTokens?: string[]; notificationPrefs?: NotificationPreferences; active?: boolean };

  if (user.active === false) return;

  const prefKey = PREF_KEY_BY_TYPE[params.type];
  if (prefKey && user.notificationPrefs && user.notificationPrefs[prefKey] === false) return;

  const tokens = user.fcmTokens ?? [];
  if (tokens.length === 0) return;

  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: { title: params.title, body: params.body },
    data: { url: params.url ?? "/", type: params.type, tag: params.notificationId ?? params.type },
    webpush: {
      fcmOptions: { link: params.url ?? "/" },
      notification: { icon: "/icons/icon-192.png" },
    },
  });

  const invalidTokens: string[] = [];
  response.responses.forEach((r, i) => {
    if (!r.success && (r.error?.code === "messaging/registration-token-not-registered" || r.error?.code === "messaging/invalid-registration-token")) {
      invalidTokens.push(tokens[i]);
    }
  });

  if (invalidTokens.length > 0) {
    await db
      .collection("users")
      .doc(params.recipientId)
      .update({ fcmTokens: tokens.filter((t) => !invalidTokens.includes(t)) });
  }
}
