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

/**
 * Se a permissão do navegador já foi concedida antes, tenta obter/salvar o token FCM
 * de novo, sem pedir permissão (silencioso). Isso existe porque a tela "Ativar
 * notificações" só aparece quando a permissão ainda não foi concedida — se o token
 * não tiver sido salvo com sucesso na primeira vez (ex.: erro de rede, bug já corrigido),
 * o paciente ficaria com a permissão concedida mas sem token, sem nenhuma forma de
 * tentar de novo pela interface. Chamado automaticamente a cada abertura do app.
 */
export async function ensureTokenRegistered(uid: string): Promise<void> {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

  try {
    const supported = await isSupported().catch(() => false);
    if (!supported) return;

    const registration = await navigator.serviceWorker.ready;
    const messaging = getMessaging(firebaseApp);
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      await updateDoc(doc(db, "users", uid), { fcmTokens: arrayUnion(token) });
    }
  } catch (error) {
    console.error("Falha ao registrar token FCM silenciosamente", error);
  }
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
