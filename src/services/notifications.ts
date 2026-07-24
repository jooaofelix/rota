import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, limit, type WithFieldValue } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { NotificationDoc, NotificationType } from "@/types";

interface CreateNotificationInput {
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  routineItemId?: string;
  url?: string;
}

/**
 * Cria o documento de notificação no Firestore. O envio efetivo do push (FCM)
 * é feito por uma Cloud Function (onCreate em /notifications), garantindo que
 * o disparo funcione mesmo com o app fechado.
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  await addDoc(collection(db, "notifications"), {
    ...input,
    read: false,
    sentAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  } satisfies WithFieldValue<Omit<NotificationDoc, "id">>);
}

export function subscribeToNotifications(recipientId: string, callback: (items: NotificationDoc[]) => void) {
  const q = query(
    collection(db, "notifications"),
    where("recipientId", "==", recipientId),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as NotificationDoc)));
  });
}

export async function markNotificationRead(notificationId: string) {
  await updateDoc(doc(db, "notifications", notificationId), { read: true });
}
