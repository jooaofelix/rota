import { getToken, getMessaging, isSupported, onMessage } from "firebase/messaging";
import { arrayUnion, doc, updateDoc } from "firebase/firestore";
import { firebaseApp, db } from "./config";

/**
 * Solicita permissão de notificação do navegador e registra o token FCM do
 * dispositivo no documento do usuário. Deve ser chamado apenas depois que o
 * usuário confirmar na tela explicativa (nunca automaticamente ao abrir o app).
 */
export async function enableNotifications(uid: string): Promise<"granted" | "denied" | "unsupported"> {
  const supported = await isSupported().catch(() => false);
  if (!supported) return "unsupported";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  const registration = await navigator.serviceWorker.ready;
  const messaging = getMessaging(firebaseApp);
  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (token) {
    await updateDoc(doc(db, "users", uid), { fcmTokens: arrayUnion(token) });
  }

  return "granted";
}

export function currentNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

/** Notificações recebidas com o app em primeiro plano (aba aberta). */
export async function listenForegroundMessages(callback: (title: string, body: string) => void) {
  const supported = await isSupported().catch(() => false);
  if (!supported) return () => undefined;

  const messaging = getMessaging(firebaseApp);
  return onMessage(messaging, (payload) => {
    callback(payload.notification?.title ?? "ROTA", payload.notification?.body ?? "");
  });
}
