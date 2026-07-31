import { createPortal } from "react-dom";
import type { RoomCheck } from "@/utils/roomAvailability";
import { conflictEmailBody } from "@/utils/roomAvailability";
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
  ownerName,
  date,
  startTime,
  endTime,
  onConfirm,
  onCancel,
}: {
  check: RoomCheck;
  ownerName: string;
  date: string;
  startTime: string;
  endTime: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (check.status === "own" || check.status === "unknown") return null;

  const ocupada = check.status === "taken";
  const nome = ocupada ? check.occupantName : "";
  const email = ocupada ? check.occupant?.email : undefined;
  const corpo = ocupada ? conflictEmailBody(nome, ownerName, date, startTime, endTime) : "";

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

        {ocupada && (
          <div className="mt-3 rounded-2xl bg-cream-100 p-3">
            <p className="text-xs leading-snug text-brand-600">
              Se for uma troca combinada, siga em frente. Vale avisar {nome.split(" ")[0]} para não
              haver dois atendimentos na mesma sala.
            </p>
            {email ? (
              <a
                href={`mailto:${email}?subject=${encodeURIComponent("Uso da sala — " + formatShortDate(date))}&body=${encodeURIComponent(corpo)}`}
                className="btn-secondary mt-2.5"
              >
                ✉️ Avisar {nome.split(" ")[0]}
              </a>
            ) : (
              <p className="mt-2 text-xs font-bold text-brand-400">
                Sem e-mail cadastrado para {nome.split(" ")[0]}.
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button onClick={onCancel} className="btn-secondary flex-1">
            Escolher outro
          </button>
          <button onClick={onConfirm} className="btn-primary flex-1">
            Marcar assim mesmo
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
