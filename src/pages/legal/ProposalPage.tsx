import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getProposal, respondToProposal } from "@/services/offers";
import type { ProposalDoc } from "@/types";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { formatMoney } from "@/utils/agenda";
import { formatShortDate, todayKey } from "@/utils/date";
import { OFFER_KIND_ICONS, discountPercent, firstName, pricePerSession } from "@/utils/proposals";

/**
 * Página aberta pelo link da proposta, sem login.
 *
 * O paciente não precisa ter conta no ROTA para responder — o código no endereço
 * é a credencial, como no aviso de uso da sala. Mostra só o que foi oferecido:
 * nada de prontuário, nada de histórico, nada sobre outros pacientes.
 */
export function ProposalPage() {
  const { token = "" } = useParams();
  const [proposal, setProposal] = useState<ProposalDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getProposal(token)
      .then(setProposal)
      .catch(() => setProposal(null))
      .finally(() => setLoading(false));
  }, [token]);

  async function responder(status: "accepted" | "declined") {
    setSending(true);
    try {
      await respondToProposal(token, status, note);
      setProposal((prev) => (prev ? { ...prev, status, replyNote: note } : prev));
    } finally {
      setSending(false);
    }
  }

  if (loading) return <LoadingSpinner brand />;

  if (!proposal) {
    return (
      <Moldura>
        <p className="text-lg font-extrabold text-brand-900">Proposta não encontrada</p>
        <p className="mt-2 text-sm text-brand-500">
          O link pode estar incompleto. Peça para reenviarem.
        </p>
      </Moldura>
    );
  }

  const respondido = proposal.status !== "sent";
  const vencida = !respondido && proposal.validUntil < todayKey();
  const desconto = discountPercent(proposal.price, proposal.listPrice);
  const porSessao = pricePerSession(proposal.price, proposal.sessions);

  return (
    <Moldura>
      <img src="/logo-icon.png" alt="ROTA" className="mx-auto mb-4 h-14 w-14 rounded-2xl" />

      <p className="text-lg font-extrabold text-brand-900">Oi, {firstName(proposal.patientName)}!</p>
      <p className="mt-1 text-sm text-brand-500">
        <span className="font-bold text-brand-700">{proposal.professionalName}</span> separou esta
        condição para você.
      </p>

      <div className="mt-4 rounded-2xl border-2 border-brand-100 p-4">
        <p className="text-2xl">{OFFER_KIND_ICONS[proposal.kind]}</p>
        <p className="mt-1 text-base font-extrabold text-brand-900">{proposal.title}</p>
        {proposal.description && (
          <p className="mt-1 text-sm leading-relaxed text-brand-600">{proposal.description}</p>
        )}

        <div className="mt-3 flex items-end gap-2">
          <p className="text-3xl font-extrabold text-brand-700">{formatMoney(proposal.price)}</p>
          {desconto && (
            <>
              <p className="pb-1 text-sm text-brand-400 line-through">{formatMoney(proposal.listPrice)}</p>
              <span className="mb-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-extrabold text-emerald-600">
                −{desconto}%
              </span>
            </>
          )}
        </div>

        <ul className="mt-2 flex flex-col gap-1 text-sm text-brand-600">
          {proposal.sessions > 0 && (
            <li>
              ✓ {proposal.sessions} {proposal.sessions === 1 ? "sessão" : "sessões"}
              {porSessao && ` · ${formatMoney(porSessao)} cada`}
            </li>
          )}
          {proposal.installments && proposal.installments > 1 && (
            <li>
              ✓ Em até {proposal.installments}x de {formatMoney(proposal.price / proposal.installments)}
            </li>
          )}
          {proposal.validityDays && <li>✓ {proposal.validityDays} dias para usar as sessões</li>}
        </ul>
      </div>

      {respondido ? (
        <div className="mt-4 rounded-2xl bg-brand-50 p-4 text-center">
          <p className="text-3xl">{proposal.status === "accepted" ? "🎉" : "👍"}</p>
          <p className="mt-1 text-sm font-bold text-brand-700">
            {proposal.status === "accepted"
              ? "Você aceitou. Combinamos os horários por aqui mesmo."
              : "Tudo bem, ficou registrado que agora não dá."}
          </p>
          {proposal.replyNote && <p className="mt-1 text-xs text-brand-500">"{proposal.replyNote}"</p>}
          <p className="mt-2 text-xs text-brand-400">
            {proposal.professionalName} já recebeu sua resposta.
          </p>
        </div>
      ) : vencida ? (
        <div className="mt-4 rounded-2xl bg-cream-100 p-4 text-center">
          <p className="text-sm font-bold text-brand-600">
            Esta proposta valia até {formatShortDate(proposal.validUntil)}.
          </p>
          <p className="mt-1 text-xs text-brand-400">
            Fale com {firstName(proposal.professionalName)} se ainda tiver interesse — dá para
            reenviar.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-4 text-center text-xs font-bold text-brand-500">
            Vale até {formatShortDate(proposal.validUntil)}
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Quer dizer alguma coisa? (opcional)"
            className="input-field mt-2 resize-none text-sm"
          />
          <div className="mt-3 flex flex-col gap-2">
            <button onClick={() => responder("accepted")} disabled={sending} className="btn-primary">
              ✅ Quero, pode contar comigo
            </button>
            <button onClick={() => responder("declined")} disabled={sending} className="btn-secondary">
              Agora não dá
            </button>
          </div>
          <p className="mt-3 text-center text-[11px] leading-snug text-brand-400">
            Responder aqui não cobra nada e não gera boleto. O pagamento é combinado direto com{" "}
            {firstName(proposal.professionalName)}.
          </p>
        </>
      )}

      <p className="mt-5 text-center text-[11px] leading-snug text-brand-300">
        Este link é pessoal e mostra apenas esta proposta.
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
