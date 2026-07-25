import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { ensureTokenRegistered, listenForegroundMessages } from "@/firebase/messaging";

/** Mostra um toast quando uma notificação push chega com o app aberto em primeiro plano. */
export function ForegroundNotificationListener() {
  const { firebaseUser } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (!firebaseUser) return;
    let unsubscribe: (() => void) | undefined;
    listenForegroundMessages((title, body) => showToast(`${title}: ${body}`, "info")).then((unsub) => {
      unsubscribe = unsub;
    });
    return () => unsubscribe?.();
  }, [firebaseUser, showToast]);

  // Se a permissão já tiver sido concedida antes mas o token não tiver sido salvo com
  // sucesso, tenta de novo silenciosamente a cada abertura do app (sem pedir permissão).
  useEffect(() => {
    if (!firebaseUser) return;
    ensureTokenRegistered(firebaseUser.uid);
  }, [firebaseUser]);

  return null;
}
