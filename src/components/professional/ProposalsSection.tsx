import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { getLinkedPatientsBasics } from "@/services/patients";
import { isExpired, proposalLink, removeProposal, subscribeToOffers, subscribeToProposals } from "@/services/offers";
import type { OfferDoc, ProposalDoc } from "@/types";
import { formatMoney } from "@/utils/agenda";
import { formatShortDate, todayKey } from "@/utils/date";
import { OFFER_KIND_ICONS } from "@/utils/proposals";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { OfferCatalogSheet } from "./OfferCatalogSheet";
import { ProposalSheet } from "./ProposalSheet";

const ESTADO = {
  sent: { rotulo: "Enviada", emoji: "📨", estilo: "bg-amber-100 text-amber-700" },
  accepted: { rotulo: "Aceitou", emoji: "🎉", estilo: "bg-emerald-100 text-emerald-700" },
  declined: { rotulo: "Agora não", emoji: "🙏", estilo: "bg-brand-100 text-brand-600" },
} as const;

/**
 * Propostas: o lado comercial das finanças.
 *
 * O resto da tela conta o que já aconteceu — recebido, em aberto, atrasado. Esta
 * parte é a única que olha para frente: o que foi oferecido, para quem, e o que
 * a pessoa respondeu.
 */
export function ProposalsSection() {
  const { firebaseUser, userDoc } = useAuth();
  const { showToast } = useToast();
  const [offers, setOffers] = useState<OfferDoc[]>([]);
  const [proposals, setProposals] = useState<ProposalDoc[]>([]);
  const [patients, setPatients] = useState<{ id: string; nome: string }[]>([]);
  const [criando, setCriando] = useState(false);
  const [catalogo, setCatalogo] = useState(false);
  const [apagando, setApagando] = useState<ProposalDoc | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeToOffers(firebaseUser.uid, setOffers);
  }, [firebaseUser]);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeToProposals(firebaseUser.uid, setProposals);
  }, [firebaseUser]);

  useEffect(() => {
    if (!firebaseUser) return;
    let vivo = true;
    // Nome e id bastam para escolher a quem mandar a proposta.
    getLinkedPatientsBasics(firebaseUser.uid)
      .then((lista) => vivo && setPatients(lista.map((p) => ({ id: p.id, nome: p.name }))))
      .catch(() => vivo && setPatients([]));
    return () => {
      vivo = false;
    };
  }, [firebaseUser]);

  const hoje = todayKey();

  const resumo = useMemo(() => {
    const aguardando = proposals.filter((p) => p.status === "sent" && !isExpired(p, hoje));
    const aceitas = proposals.filter((p) => p.status === "accepted");
    return {
      aguardando: aguardando.length,
      emJogo: aguardando.reduce((a, p) => a + p.price, 0),
      fechado: aceitas.reduce((a, p) => a + p.price, 0),
    };
  }, [proposals, hoje]);

  async function copiar(p: ProposalDoc) {
    try {
      await navigator.clipboard.writeText(proposalLink(p.id));
      showToast("Link copiado.");
    } catch {
      showToast(proposalLink(p.id));
    }
  }

  return (
    <div className="card">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <p className="text-sm font-bold text-brand-700">Propostas</p>
        <button onClick={() => setCatalogo(true)} className="shrink-0 text-xs font-bold text-brand-500">
          O que você vende
        </button>
      </div>

      {proposals.length === 0 ? (
        <p className="mb-3 text-xs leading-relaxed text-brand-400">
          Ofereça um pacote, um retorno ou uma avaliação a um paciente. Ele recebe a proposta por
          WhatsApp ou e-mail, responde num link — e a resposta aparece aqui, em vez de se perder no
          meio da conversa.
        </p>
      ) : (
        <>
          <div className="mb-3 flex gap-4 text-xs">
            <span className="text-brand-400">
              Aguardando resposta:{" "}
              <span className="font-extrabold text-brand-700">{formatMoney(resumo.emJogo)}</span>
            </span>
            <span className="text-brand-400">
              Fechado: <span className="font-extrabold text-emerald-600">{formatMoney(resumo.fechado)}</span>
            </span>
          </div>

          <div className="mb-3 flex flex-col">
            {proposals.slice(0, 10).map((p) => {
              const vencida = isExpired(p, hoje);
              const e = ESTADO[p.status];
              return (
                <div key={p.id} className="flex items-start gap-2.5 border-b border-brand-50 py-2.5 last:border-b-0">
                  <span className="text-lg leading-none">{vencida ? "⌛" : e.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-brand-800">{p.patientName}</p>
                    <p className="truncate text-xs text-brand-400">
                      {OFFER_KIND_ICONS[p.kind]} {p.title} · {formatMoney(p.price)}
                    </p>
                    {p.replyNote && (
                      <p className="mt-1 rounded-lg bg-brand-50/70 px-2 py-1 text-xs italic text-brand-600">
                        "{p.replyNote}"
                      </p>
                    )}
                    {p.status === "sent" && (
                      <div className="mt-1 flex gap-3">
                        <button onClick={() => copiar(p)} className="text-[11px] font-bold text-brand-500">
                          Copiar link
                        </button>
                        <button onClick={() => setApagando(p)} className="text-[11px] font-bold text-rose-400">
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                  <span
                    className={clsx(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
                      vencida ? "bg-cream-200 text-brand-500" : e.estilo
                    )}
                  >
                    {vencida ? `Venceu ${formatShortDate(p.validUntil)}` : e.rotulo}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      <button onClick={() => setCriando(true)} className="btn-primary">
        + Nova proposta
      </button>

      {criando && firebaseUser && (
        <ProposalSheet
          professionalId={firebaseUser.uid}
          professionalName={userDoc?.name ?? "Sua profissional"}
          offers={offers}
          patients={patients}
          onClose={() => setCriando(false)}
        />
      )}

      {catalogo && firebaseUser && (
        <OfferCatalogSheet
          professionalId={firebaseUser.uid}
          offers={offers}
          onClose={() => setCatalogo(false)}
        />
      )}

      <ConfirmDialog
        open={!!apagando}
        title="Cancelar esta proposta?"
        description="O link para de funcionar. Se a pessoa abrir depois, verá que a proposta não existe mais."
        confirmLabel="Cancelar proposta"
        danger
        onConfirm={async () => {
          if (apagando) await removeProposal(apagando.id);
          setApagando(null);
          showToast("Proposta cancelada.");
        }}
        onCancel={() => setApagando(null)}
      />
    </div>
  );
}
