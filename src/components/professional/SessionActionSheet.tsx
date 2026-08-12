import { useEffect, useState } from "react";
import clsx from "clsx";
import { BottomSheet } from "@/components/common/BottomSheet";
import { useToast } from "@/contexts/ToastContext";
import { setPaymentStatus, updateSession } from "@/services/sessions";
import { draftFromSession } from "@/services/invoices";
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
  const [gerandoNota, setGerandoNota] = useState(false);

  /**
   * A folha recebe o retrato da sessão de quando a linha foi tocada. Sem cópia
   * local, marcar "pago" gravava no banco mas os botões continuavam do jeito
   * anterior, e parecia que nada tinha acontecido. Aqui a escolha aparece na
   * hora e o retrato de fora só volta a mandar se a sessão mudar por fora.
   */
  const [view, setView] = useState(session);
  useEffect(() => setView(session), [session]);

  /**
   * Cria o rascunho e para aí. Transmitir daqui seria um toque de distância de
   * um documento fiscal — a confirmação fica em Finanças, com o cadastro à vista.
   */
  async function gerarNota() {
    if (gerandoNota) return;
    setGerandoNota(true);
    try {
      await draftFromSession(view, `Atendimento psicológico — ${view.patientName}`);
      showToast("Rascunho criado. Confira e emita em Finanças › Notas fiscais.");
    } catch {
      showToast("Não deu para criar o rascunho agora.");
    } finally {
      setGerandoNota(false);
    }
  }

  async function changeStatus(status: SessionStatus) {
    setView((v) => ({ ...v, status }));
    try {
      await updateSession(session.id, { status });
      showToast(`Sessão marcada como "${STATUS_LABELS[status].toLowerCase()}".`);
    } catch {
      setView((v) => ({ ...v, status: session.status }));
      showToast("Não deu para atualizar agora.");
    }
  }

  async function changePayment(status: PaymentStatus, method?: PaymentMethod) {
    setView((v) => ({ ...v, paymentStatus: status, paymentMethod: method ?? v.paymentMethod }));
    try {
      await setPaymentStatus(session.id, status, method);
      showToast(status === "paid" ? "Pagamento registrado." : "Situação atualizada.");
    } catch {
      setView((v) => ({ ...v, paymentStatus: session.paymentStatus, paymentMethod: session.paymentMethod }));
      showToast("Não deu para atualizar agora.");
    }
  }

  if (openingRecord) {
    return <SessionRecordSheet session={session} onClose={onClose} onBack={() => setOpeningRecord(false)} />;
  }

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={session.patientName}
      footer={
        <div className="flex flex-col gap-2">
          <button className="btn-primary" onClick={() => setOpeningRecord(true)}>
            📝 Registro da sessão
          </button>
          <button className="btn-secondary" onClick={onEdit}>
            Editar horário e valor
          </button>
          {view.price ? (
            <button className="btn-secondary" onClick={gerarNota}>
              🧾 Emitir nota
            </button>
          ) : null}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-brand-500">
          <span className="font-bold text-brand-700">
            {formatShortDate(view.date)} · {view.startTime} às {view.endTime}
          </span>
          <span>·</span>
          <span>{view.modality === "online" ? "Online" : "Presencial"}</span>
          {view.price != null && (
            <>
              <span>·</span>
              <span className="font-bold">{formatMoney(view.price)}</span>
            </>
          )}
          <span className={clsx("rounded-full px-2 py-0.5 text-xs font-bold", PAYMENT_STYLES[view.paymentStatus])}>
            {PAYMENT_LABELS[view.paymentStatus]}
          </span>
        </div>

        {view.note && <p className="rounded-xl bg-cream-100 p-3 text-sm text-brand-600">{view.note}</p>}

        <div>
          <p className="mb-1.5 text-xs font-bold text-brand-500">Situação da sessão</p>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                className={clsx(
                  "rounded-full px-3 py-1.5 text-xs font-bold",
                  view.status === s ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-600"
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
                  view.paymentStatus === s ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-600"
                )}
              >
                {PAYMENT_LABELS[s]}
              </button>
            ))}
          </div>
          {view.paymentStatus !== "exempt" && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  onClick={() => changePayment("paid", m)}
                  className={clsx(
                    "rounded-full border px-2.5 py-1 text-[11px] font-bold",
                    view.paymentMethod === m
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

      </div>
    </BottomSheet>
  );
}
