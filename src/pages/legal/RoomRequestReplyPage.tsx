import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getRoomRequest, respondToRoomRequest } from "@/services/roomRequests";
import type { RoomRequestDoc } from "@/types";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { formatShortDate } from "@/utils/date";

/**
 * Página aberta pelo link do e-mail, sem login.
 *
 * Quem divide a sala não tem conta no ROTA — o código no endereço é a credencial.
 * A página só mostra nomes, data e horário, e só permite responder uma vez.
 */
export function RoomRequestReplyPage() {
  const { token = "" } = useParams();
  const [params] = useSearchParams();
  const [request, setRequest] = useState<RoomRequestDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getRoomRequest(token)
      .then(setRequest)
      .catch(() => setRequest(null))
      .finally(() => setLoading(false));
  }, [token]);

  async function responder(status: "confirmed" | "declined") {
    setSending(true);
    try {
      await respondToRoomRequest(token, status, note);
      setRequest((prev) => (prev ? { ...prev, status, replyNote: note } : prev));
    } finally {
      setSending(false);
    }
  }

  if (loading) return <LoadingSpinner brand />;

  if (!request) {
    return (
      <Moldura>
        <p className="text-lg font-extrabold text-brand-900">Aviso não encontrado</p>
        <p className="mt-2 text-sm text-brand-500">
          O link pode ter expirado ou estar incompleto. Peça para reenviarem.
        </p>
      </Moldura>
    );
  }

  const respondido = request.status !== "pending";

  return (
    <Moldura>
      <img src="/logo-icon.png" alt="ROTA" className="mx-auto mb-4 h-14 w-14 rounded-2xl" />

      <p className="text-lg font-extrabold text-brand-900">Olá, {request.partnerName.split(" ")[0]}!</p>
      <p className="mt-2 text-sm leading-relaxed text-brand-600">
        <span className="font-bold text-brand-800">{request.ownerName}</span> precisa usar a sala em{" "}
        <span className="font-bold text-brand-800">{formatShortDate(request.date)}</span>, das{" "}
        {request.startTime} às {request.endTime} — horário que na escala é seu.
      </p>

      {respondido ? (
        <div className="mt-4 rounded-2xl bg-brand-50 p-4 text-center">
          <p className="text-3xl">{request.status === "confirmed" ? "✅" : "🚫"}</p>
          <p className="mt-1 text-sm font-bold text-brand-700">
            {request.status === "confirmed" ? "Você confirmou o empréstimo." : "Você avisou que não pode."}
          </p>
          {request.replyNote && <p className="mt-1 text-xs text-brand-500">"{request.replyNote}"</p>}
          <p className="mt-2 text-xs text-brand-400">A resposta já apareceu na agenda de {request.ownerName}.</p>
        </div>
      ) : (
        <>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Quer dizer alguma coisa? (opcional)"
            className="input-field mt-4 resize-none text-sm"
          />
          <div className="mt-3 flex flex-col gap-2">
            <button
              onClick={() => responder("confirmed")}
              disabled={sending}
              className="btn-primary"
              autoFocus={params.get("r") === "sim"}
            >
              ✅ Pode usar, tudo certo
            </button>
            <button onClick={() => responder("declined")} disabled={sending} className="btn-secondary">
              🚫 Não posso ceder nesse dia
            </button>
          </div>
        </>
      )}

      <p className="mt-5 text-center text-[11px] leading-snug text-brand-300">
        Este link é pessoal e mostra apenas o horário da sala. Nenhum dado de paciente é exibido aqui.
      </p>
    </Moldura>
  );
}

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-50 p-5">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-card">{children}</div>
    </div>
  );
}
