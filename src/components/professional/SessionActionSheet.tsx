import { useState } from "react";
import clsx from "clsx";
import { BottomSheet } from "@/components/common/BottomSheet";
import { useToast } from "@/contexts/ToastContext";
import { setPaymentStatus, updateSession } from "@/services/sessions";
import type { PaymentMethod, PaymentStatus, SessionDoc, SessionStatus } from "@/types";
import { PAYMENT_LABELS, PAYMENT_STYLES, STATUS_LABELS, formatMoney } from "@/utils/agenda";
import { formatShortDate } from "@/utils/date";
import { SessionRecordSheet } from "./SessionRecordSheet";

const STATUS_ORDER: SessionStatus[] = ["scheduled", "done", "no_show", "cancelled"];
const PAYMENT_ORDER: PaymentStatus[] = ["pending", "paid", "exempt"];

const METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "Pix",
  cash: "Dinheiro",
  card: "Cartão",
  transfer: "Transferência",
  insurance: "Convênio",
  package: "Pacote mensal",
};

export function SessionActionSheet({
  session,
  onClose,
  onEdit,
}: {
  session: SessionDoc;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { showToast } = useToast();
  const [openingRecord, setOpeningRecord] = useState(false);

  async function changeStatus(status: SessionStatus) {
    await updateSession(session.id, { status });
    showToast(`Sessão marcada como "${STATUS_LABELS[status].toLowerCase()}".`);
  }

  async function changePayment(status: PaymentStatus, method?: PaymentMethod) {
    await setPaymentStatus(session.id, status, method);
    showToast(status === "paid" ? "Pagamento registrado." : "Situação atualizada.");
  }

  if (openingRecord) {
    return <SessionRecordSheet session={session} onClose={onClose} onBack={() => setOpeningRecord(false)} />;
  }

  return (
    <BottomSheet open onClose={onClose} title={session.patientName}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-brand-500">
          <span className="font-bold text-brand-700">
            {formatShortDate(session.date)} · {session.startTime} às {session.endTime}
          </span>
          <span>·</span>
          <span>{session.modality === "online" ? "Online" : "Presencial"}</span>
          {session.price != null && (
            <>
              <span>·</span>
              <span className="font-bold">{formatMoney(session.price)}</span>
            </>
          )}
          <span className={clsx("rounded-full px-2 py-0.5 text-xs font-bold", PAYMENT_STYLES[session.paymentStatus])}>
            {PAYMENT_LABELS[session.paymentStatus]}
          </span>
        </div>

        {session.note && <p className="rounded-xl bg-cream-100 p-3 text-sm text-brand-600">{session.note}</p>}

        <div>
          <p className="mb-1.5 text-xs font-bold text-brand-500">Situação da sessão</p>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                className={clsx(
                  "rounded-full px-3 py-1.5 text-xs font-bold",
                  session.status === s ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-600"
                )}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-bold text-brand-500">Pagamento</p>
          <div className="flex flex-wrap gap-1.5">
            {PAYMENT_ORDER.map((s) => (
              <button
                key={s}
                onClick={() => changePayment(s)}
                className={clsx(
                  "rounded-full px-3 py-1.5 text-xs font-bold",
                  session.paymentStatus === s ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-600"
                )}
              >
                {PAYMENT_LABELS[s]}
              </button>
            ))}
          </div>
          {session.paymentStatus !== "exempt" && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  onClick={() => changePayment("paid", m)}
                  className={clsx(
                    "rounded-full border px-2.5 py-1 text-[11px] font-bold",
                    session.paymentMethod === m
                      ? "border-brand-400 bg-brand-50 text-brand-700"
                      : "border-brand-100 text-brand-400"
                  )}
                >
                  {METHOD_LABELS[m]}
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="btn-primary" onClick={() => setOpeningRecord(true)}>
          📝 Registro da sessão
        </button>
        <button className="btn-secondary" onClick={onEdit}>
          Editar horário e valor
        </button>
      </div>
    </BottomSheet>
  );
}
