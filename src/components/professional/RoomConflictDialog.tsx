import { useState } from "react";
import { createPortal } from "react-dom";
import type { RoomCheck } from "@/utils/roomAvailability";
import { conflictEmailBody } from "@/utils/roomAvailability";
import { createRoomRequest, newRequestToken, requestLink } from "@/services/roomRequests";
import { formatShortDate } from "@/utils/date";

/**
 * Aviso quando o atendimento cai fora do turno da profissional na sala.
 *
 * Não impede de marcar — trocas acontecem, e o app não deve decidir isso por ela.
 * Só diz de quem é a sala naquela hora e oferece avisar a pessoa, que é o passo
 * que costuma ser esquecido.
 */
export function RoomConflictDialog({
  check,
  professionalId,
  ownerName,
  date,
  startTime,
  endTime,
  onConfirm,
  onCancel,
}: {
  check: RoomCheck;
  professionalId: string;
  ownerName: string;
  date: string;
  startTime: string;
  endTime: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // O código é sorteado aqui para o corpo do e-mail já sair com os links prontos;
  // o registro só é gravado se ela realmente escolher avisar.
  const [token] = useState(newRequestToken);
  if (check.status === "own" || check.status === "unknown") return null;

  const ocupada = check.status === "taken";
  const nome = ocupada ? check.occupantName : "";
  const email = ocupada ? check.occupant?.email : undefined;
  const corpo = ocupada
    ? conflictEmailBody(nome, ownerName, date, startTime, endTime, {
        sim: requestLink(token, "sim"),
        nao: requestLink(token, "nao"),
      })
    : "";

  async function avisarEAgendar() {
    if (ocupada && check.occupant) {
      try {
        await createRoomRequest(token, {
          professionalId,
          ownerName,
          partnerId: check.occupant.id,
          partnerName: check.occupant.name,
          date,
          startTime,
          endTime,
        });
      } catch {
        // Se o registro falhar, o e-mail ainda vale — só não haverá resposta no feed.
      }
    }
    onConfirm();
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-brand-900/45" onClick={onCancel} />
      <div className="animate-pop-in relative z-10 w-full max-w-sm rounded-3xl bg-white p-5 shadow-card">
        <p className="text-lg font-extrabold text-brand-900">
          {ocupada ? "A sala é de outra pessoa nesse horário" : "Você não tem a sala nesse horário"}
        </p>

        <p className="mt-2 text-sm leading-relaxed text-brand-600">
          {formatShortDate(date)}, das {startTime} às {endTime}.{" "}
          {ocupada ? (
            <>
              Na escala, esse turno é de <span className="font-bold text-brand-800">{nome}</span>.
            </>
          ) : (
            "Esse horário não está reservado para você na escala da sala."
          )}
        </p>

        {ocupada && email && (
          <div className="mt-3 rounded-2xl bg-cream-100 p-3">
            <p className="text-xs leading-snug text-brand-600">
              Ao avisar e agendar, abre seu aplicativo de e-mail com uma mensagem pronta para{" "}
              <span className="font-bold text-brand-800">{email}</span>, dizendo que{" "}
              <span className="font-bold text-brand-800">{ownerName}</span> vai usar a sala em{" "}
              {formatShortDate(date)}, das {startTime} às {endTime}. Você confere e envia.
              <br />
              <span className="mt-1 block font-bold text-brand-700">
                A mensagem leva dois links — "pode usar" e "não posso" — e a resposta aparece
                aqui na agenda.
              </span>
            </p>
          </div>
        )}

        {ocupada && !email && (
          <p className="mt-3 rounded-2xl bg-cream-100 p-3 text-xs font-bold leading-snug text-brand-500">
            {nome.split(" ")[0]} não tem e-mail cadastrado, então não dá para avisar por aqui.
            Cadastre em Agenda › Uso da sala › Profissionais.
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {/* Âncora, e não botão: a navegação do mailto precisa sair do próprio gesto do
              toque. O agendamento dispara junto, no mesmo clique. */}
          {ocupada && email ? (
            <a
              href={`mailto:${email}?subject=${encodeURIComponent("Uso da sala — " + formatShortDate(date))}&body=${encodeURIComponent(corpo)}`}
              onClick={avisarEAgendar}
              className="btn-primary"
            >
              ✉️ Avisar {nome.split(" ")[0]} e agendar
            </a>
          ) : (
            <button onClick={onConfirm} className="btn-primary">
              Marcar assim mesmo
            </button>
          )}

          <div className="flex gap-2">
            <button onClick={onCancel} className="btn-secondary flex-1">
              Escolher outro
            </button>
            {ocupada && email && (
              <button onClick={onConfirm} className="btn-secondary flex-1">
                Só agendar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
