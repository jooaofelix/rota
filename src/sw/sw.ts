/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";
import { clientsClaim } from "workbox-core";
import { registerRoute } from "workbox-routing";
import { NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

self.skipWaiting();
clientsClaim();

// Precache dos arquivos de build (injetado pelo vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST);

// Navegação: tenta rede, cai para cache (funciona offline após primeira visita)
registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({ cacheName: "rota-pages" })
);

// Imagens/áudio anexados às atividades: cache com atualização em segundo plano
registerRoute(
  ({ request }) => request.destination === "image" || request.destination === "audio",
  new StaleWhileRevalidate({ cacheName: "rota-media" })
);

/**
 * Firebase Cloud Messaging - notificações em segundo plano.
 * As chaves vêm de variáveis de ambiente injetadas em build time pelo Vite,
 * pois este arquivo passa pelo bundler (estratégia injectManifest).
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (firebaseConfig.apiKey) {
  const app = initializeApp(firebaseConfig);
  const messaging = getMessaging(app);

  onBackgroundMessage(messaging, (payload) => {
    const title = payload.notification?.title ?? "ROTA";
    const body = payload.notification?.body ?? "Você tem uma novidade na sua rotina.";
    const data = payload.data ?? {};

    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || "rota-notification",
      data,
      vibrate: [80, 40, 80],
    });
  });
}

self.addEventListener("notificationclick", (event) => {
  const notificationEvent = event as NotificationEvent;
  notificationEvent.notification.close();
  const targetUrl = (notificationEvent.notification.data && notificationEvent.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = allClients.find((c) => "focus" in c);
      if (existing) {
        await (existing as WindowClient).focus();
        (existing as WindowClient).navigate(targetUrl);
        return;
      }
      await self.clients.openWindow(targetUrl);
    })()
  );
});
