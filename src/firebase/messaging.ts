import { getToken, getMessaging, isSupported, onMessage } from "firebase/messaging";
import { arrayUnion, doc, updateDoc } from "firebase/firestore";
import { firebaseApp, db } from "./config";

/**
 * Solicita permissão de notificação do navegador e registra o token FCM do
 * dispositivo no documento do usuário. Deve ser chamado apenas depois que o
 * usuário confirmar na tela explicativa (nunca automaticamente ao abrir o app).
 *
 * Importante: `Notification.requestPermission()` precisa ser a primeira coisa
 * chamada, sem nenhum `await` antes — no Safari/iOS o navegador só entende o
 * pedido como resposta direta ao toque do usuário (gesture) se não houver
 * nenhuma pausa assíncrona no meio do caminho; um `await` antes (como checar
 * `isSupported()`) faz o iOS ignorar ou negar o pedido silenciosamente.
 */
export async function enableNotifications(uid: string): Promise<"granted" | "denied" | "unsupported"> {
  if (typeof Notification === "undefined") return "unsupported";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  const supported = await isSupported().catch(() => false);
  if (!supported) return "unsupported";

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
