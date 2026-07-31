import { useEffect, useState } from "react";
import clsx from "clsx";
import { subscribeToRoomRequests } from "@/services/roomRequests";
import type { RoomRequestDoc } from "@/types";
import { formatShortDate } from "@/utils/date";

const ESTADO = {
  pending: { rotulo: "Aguardando", emoji: "⏳", estilo: "bg-amber-100 text-amber-700" },
  confirmed: { rotulo: "Liberou", emoji: "✅", estilo: "bg-emerald-100 text-emerald-700" },
  declined: { rotulo: "Não pode", emoji: "🚫", estilo: "bg-rose-100 text-rose-700" },
} as const;

/**
 * Respostas aos avisos de uso da sala.
 *
 * Cada aviso enviado vira uma linha aqui, e o parceiro responde pelo link do
 * e-mail sem precisar de conta. É o que fecha o ciclo: antes o aviso saía e não
 * havia como saber se tinha sido aceito.
 */
export function RoomRequestsFeed({ professionalId }: { professionalId: string }) {
  const [requests, setRequests] = useState<RoomRequestDoc[]>([]);

  useEffect(() => subscribeToRoomRequests(professionalId, setRequests), [professionalId]);

  // Mesmo vazio o cartão aparece: é como ela descobre que dá para avisar o
  // parceiro pelo próprio app em vez de mandar mensagem por fora.
  if (requests.length === 0) {
    return (
      <div className="card">
        <p className="text-sm font-bold text-brand-700">Avisos de uso da sala</p>
        <p className="mt-1 text-xs leading-relaxed text-brand-400">
          Quando você marcar um atendimento num horário que na escala é de outro profissional, o
          app oferece avisar a pessoa por e-mail. A resposta dela — liberou ou não pode — aparece
          aqui.
        </p>
      </div>
    );
  }

  const aguardando = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="card">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-sm font-bold text-brand-700">Avisos de uso da sala</p>
        {aguardando > 0 && (
          <span className="shrink-0 text-xs font-bold text-amber-600">{aguardando} sem resposta</span>
        )}
      </div>

      <div className="flex flex-col">
        {requests.slice(0, 8).map((r) => {
          const e = ESTADO[r.status];
          return (
            <div key={r.id} className="flex items-start gap-2.5 border-b border-brand-50 py-2.5 last:border-b-0">
              <span className="text-lg leading-none">{e.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-brand-800">{r.partnerName}</p>
                <p className="text-xs text-brand-400">
                  {formatShortDate(r.date)} · {r.startTime} às {r.endTime}
                </p>
                {r.replyNote && (
                  <p className="mt-1 rounded-lg bg-brand-50/70 px-2 py-1 text-xs italic text-brand-600">
                    "{r.replyNote}"
                  </p>
                )}
              </div>
              <span className={clsx("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", e.estilo)}>
                {e.rotulo}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
