import { useEffect, useState } from "react";
import clsx from "clsx";
import { BottomSheet } from "@/components/common/BottomSheet";
import { useToast } from "@/contexts/ToastContext";
import { setPaymentStatus, updateSession } from "@/services/sessions";
import { draftFromSession } from "@/services/invoices";
import { NFSE_ATIVA } from "@/config/features";
import type { PaymentMethod, PaymentStatus, SessionDoc, SessionModality, SessionStatus } from "@/types";
import { PAYMENT_LABELS, PAYMENT_STYLES, STATUS_LABELS, formatMoney } from "@/utils/agenda";
import { formatShortDate } from "@/utils/date";
import { SessionRecordSheet } from "./SessionRecordSheet";

// Veio e faltou já estão nos botões grandes acima; aqui ficam as duas saídas que
// eles não cobrem — voltar ao estado neutro e cancelar.
const STATUS_ORDER: SessionStatus[] = ["scheduled", "cancelled"];
// Pagar e pago já estão nos botões grandes; sobra a isenção, que é decisão
// diferente — não é "ainda não pagou", é "não vai pagar".
const PAYMENT_ORDER: PaymentStatus[] = ["exempt"];

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

  async function changeModality(modality: SessionModality) {
    setView((v) => ({ ...v, modality }));
    try {
      await updateSession(session.id, { modality });
      showToast(modality === "online" ? "Marcada como online." : "Marcada como presencial.");
    } catch {
      setView((v) => ({ ...v, modality: session.modality }));
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
          {NFSE_ATIVA && view.price ? (
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

        {/* As três perguntas que ela responde depois de cada atendimento —
            compareceu, pagou, onde foi — em um toque cada, grandes o bastante
            para o dedo e claras o bastante para o mouse. Tocar de novo no que já
            está marcado desfaz: errar o botão não pode custar uma ida ao editor. */}
        <div className="grid gap-2">
          <Escolha
            pergunta="Compareceu?"
            opcoes={[
              { valor: "done", icone: "👍", rotulo: "Veio", cor: "emerald" },
              { valor: "no_show", icone: "👎", rotulo: "Faltou", cor: "rose" },
            ]}
            atual={view.status}
            onEscolher={(v) => changeStatus(v === view.status ? "scheduled" : (v as SessionStatus))}
          />
          <Escolha
            pergunta="Pagou?"
            opcoes={[
              { valor: "paid", icone: "💲", rotulo: "Pago", cor: "emerald" },
              { valor: "pending", icone: "💰", rotulo: "A pagar", cor: "rose" },
            ]}
            atual={view.paymentStatus}
            onEscolher={(v) => changePayment(v as PaymentStatus)}
          />
          <Escolha
            pergunta="Onde foi?"
            opcoes={[
              { valor: "in_person", icone: "🏠", rotulo: "Presencial", cor: "brand" },
              { valor: "online", icone: "💻", rotulo: "Online", cor: "brand" },
            ]}
            atual={view.modality}
            onEscolher={(v) => changeModality(v as SessionModality)}
          />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-bold text-brand-500">Outras situações</p>
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
          <p className="mb-1.5 text-xs font-bold text-brand-500">Isenção e forma de pagamento</p>
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

/**
 * Uma pergunta com duas respostas, do tamanho de um botão de verdade.
 *
 * O alvo tem 44px de altura porque é o mínimo que um dedo acerta sem mirar, e a
 * cor só aparece na resposta escolhida — duas cores fortes lado a lado disputam
 * a atenção e nenhuma das duas informa nada.
 */
const CORES: Record<string, string> = {
  emerald: "bg-emerald-500 text-white",
  rose: "bg-rose-500 text-white",
  amber: "bg-amber-500 text-white",
  brand: "bg-brand-500 text-white",
};

function Escolha({
  pergunta,
  opcoes,
  atual,
  onEscolher,
}: {
  pergunta: string;
  opcoes: Array<{ valor: string; icone: string; rotulo: string; cor: string }>;
  atual: string;
  onEscolher: (valor: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <p className="w-24 shrink-0 text-[11px] font-bold leading-tight text-brand-500">{pergunta}</p>
      <div className="flex flex-1 gap-1.5">
        {opcoes.map((o) => (
          <button
            key={o.valor}
            onClick={() => onEscolher(o.valor)}
            className={clsx(
              "flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-bold transition",
              atual === o.valor ? CORES[o.cor] : "bg-cream-100 text-brand-500 hover:bg-brand-50"
            )}
          >
            <span className="text-base">{o.icone}</span>
            {o.rotulo}
          </button>
        ))}
      </div>
    </div>
  );
}
