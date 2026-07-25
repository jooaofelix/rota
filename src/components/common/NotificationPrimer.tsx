import { useState } from "react";
import { enableNotifications } from "@/firebase/messaging";
import { useToast } from "@/contexts/ToastContext";

/** Tela/cartão explicativo — nunca solicitamos permissão do navegador sem antes explicar o benefício. */
export function NotificationPrimer({ uid, onDone }: { uid: string; onDone?: (granted: boolean) => void }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleEnable() {
    setLoading(true);
    try {
      const result = await enableNotifications(uid);
      if (result === "granted") {
        showToast("Notificações ativadas! Você vai receber os lembretes da sua rotina.");
      } else if (result === "denied") {
        showToast("Permissão não concedida. Você pode ativar depois nas configurações do navegador.", "info");
      } else {
        showToast("Seu navegador não tem suporte a notificações.", "info");
      }
      onDone?.(result === "granted");
    } catch (error) {
      console.error("Falha ao ativar notificações", error);
      showToast("Não foi possível ativar as notificações agora. Tente novamente.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card border-2 border-brand-200 bg-brand-50 text-center">
      <p className="text-3xl">🔔</p>
      <p className="mt-1 text-sm font-bold text-brand-800">Ative as notificações</p>
      <p className="mt-1 text-sm text-brand-500">
        Para receber lembretes da sua rotina no momento certo, mesmo com o app fechado.
      </p>
      <button className="btn-primary mt-3" onClick={handleEnable} disabled={loading}>
        {loading ? "Ativando..." : "Ativar notificações"}
      </button>
    </div>
  );
}
