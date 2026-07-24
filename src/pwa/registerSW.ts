import { registerSW } from "virtual:pwa-register";

/** Registra o service worker e mantém o app atualizado automaticamente. */
export function initPwa() {
  if (!("serviceWorker" in navigator)) return;

  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      // Verifica por atualizações periodicamente enquanto o app está aberto.
      if (registration) {
        setInterval(() => registration.update(), 60 * 60 * 1000);
      }
    },
  });
}
