import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { sendPushToUser } from "../sendPush";
import type { NotificationType } from "../types";

/** Dispara o push (FCM) sempre que um documento de notificação é criado, mesmo com o app fechado. */
export const onNotificationCreate = onDocumentCreated("notifications/{notificationId}", async (event) => {
  const data = event.data?.data();
  if (!data) return;

  await sendPushToUser({
    recipientId: data.recipientId,
    type: data.type as NotificationType,
    title: data.title,
    body: data.body,
    url: data.url,
    notificationId: event.params.notificationId,
  });
});
