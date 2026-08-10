import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { BottomSheet } from "@/components/common/BottomSheet";
import { useToast } from "@/contexts/ToastContext";
import { getUserDoc } from "@/services/patients";
import { createProposal, newProposalToken, proposalLink } from "@/services/offers";
import type { OfferDoc, OfferKind } from "@/types";
import { formatMoney } from "@/utils/agenda";
import { todayKey } from "@/utils/date";
import { OFFER_KIND_ICONS, discountPercent, pricePerSession, proposalMessage } from "@/utils/proposals";

interface PacienteOpcao {
  id: string;
  nome: string;
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Monta e envia uma proposta.
 *
 * O envio é pelo aplicativo dela — WhatsApp ou e-mail —, não por um serviço de
 * disparo. É como ela já fala com o paciente, e o texto passa pelos olhos dela
 * antes de sair. O que o ROTA acrescenta é o link de resposta: sem ele, "vou
 * pensar" some no meio da conversa e nunca vira sim nem não.
 */
export function ProposalSheet({
  professionalId,
  professionalName,
  offers,
  patients,
  onClose,
}: {
  professionalId: string;
  professionalName: string;
  offers: OfferDoc[];
  patients: PacienteOpcao[];
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [token] = useState(newProposalToken);
  const [patientId, setPatientId] = useState<string>(patients[0]?.id ?? "");
  const [patientName, setPatientName] = useState(patients[0]?.nome ?? "");
  const [patientEmail, setPatientEmail] = useState("");
  const inicial = offers[0];
  const [kind, setKind] = useState<OfferKind>(inicial?.kind ?? "package");
  const [title, setTitle] = useState(inicial?.title ?? "");
  const [description, setDescription] = useState(inicial?.description ?? "");
  const [sessions, setSessions] = useState(inicial?.sessions ?? 4);
  const [price, setPrice] = useState(inicial?.price ?? 0);
  const [listPrice, setListPrice] = useState(inicial?.listPrice ?? 0);
  const [installments, setInstallments] = useState(inicial?.installments ?? 1);
  const [validityDays, setValidityDays] = useState(inicial?.validityDays ?? 45);
  const [validUntil, setValidUntil] = useState(daysFromNow(7));
  const [criando, setCriando] = useState(false);
  const [enviada, setEnviada] = useState(false);

  // Busca o e-mail do paciente escolhido: uma leitura só, e só quando muda.
  useEffect(() => {
    if (!patientId) return;
    let vivo = true;
    getUserDoc(patientId)
      .then((u) => {
        if (vivo && u?.email) setPatientEmail(u.email);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [patientId]);

  function aplicarOferta(o: OfferDoc) {
    setKind(o.kind);
    setTitle(o.title);
    setDescription(o.description ?? "");
    setSessions(o.sessions);
    setPrice(o.price);
    setListPrice(o.listPrice ?? 0);
    setInstallments(o.installments ?? 1);
    setValidityDays(o.validityDays ?? 0);
  }

  const dados = useMemo(
    () => ({
      professionalId,
      professionalName,
      patientId: patientId || undefined,
      patientName: patientName.trim(),
      patientEmail: patientEmail.trim() || undefined,
      title: title.trim(),
      description: description.trim() || undefined,
      kind,
      sessions,
      price,
      listPrice: listPrice > price ? listPrice : undefined,
      installments: installments > 1 ? installments : undefined,
      validityDays: validityDays > 0 ? validityDays : undefined,
      validUntil,
    }),
    [professionalId, professionalName, patientId, patientName, patientEmail, title, description, kind, sessions, price, listPrice, installments, validityDays, validUntil]
  );

  const link = proposalLink(token);
  const mensagem = useMemo(() => proposalMessage(dados, link), [dados, link]);
  const podeEnviar = dados.patientName.length > 1 && dados.title.length > 1 && price > 0 && !criando;

  /** Grava antes de abrir o aplicativo: o link só funciona se a proposta existir. */
  async function garantirCriada() {
    if (enviada) return true;
    setCriando(true);
    try {
      await createProposal(token, dados);
      setEnviada(true);
      return true;
    } catch {
      showToast("Não deu para registrar a proposta agora.");
      return false;
    } finally {
      setCriando(false);
    }
  }

  async function enviarWhatsapp() {
    if (!(await garantirCriada())) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(mensagem)}`, "_blank");
    showToast("Proposta registrada. A resposta aparece aqui.");
  }

  async function enviarEmail() {
    if (!(await garantirCriada())) return;
    const assunto = `Proposta — ${dados.title}`;
    window.location.href = `mailto:${dados.patientEmail ?? ""}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(mensagem)}`;
    showToast("Proposta registrada. A resposta aparece aqui.");
  }

  async function copiarLink() {
    if (!(await garantirCriada())) return;
    try {
      await navigator.clipboard.writeText(link);
      showToast("Link copiado.");
    } catch {
      showToast(link);
    }
  }

  const desconto = discountPercent(price, listPrice);
  const porSessao = pricePerSession(price, sessions);

  return (
    <BottomSheet
      open
      onClose={onClose}
      title="Nova proposta"
      footer={
        enviada ? (
          <div className="flex flex-col gap-2">
            <p className="text-center text-xs font-bold text-emerald-600">
              ✓ Registrada. Pode enviar por outro caminho também — é o mesmo link.
            </p>
            <div className="flex gap-2">
              <button onClick={enviarWhatsapp} className="btn-secondary flex-1">
                WhatsApp
              </button>
              <button onClick={copiarLink} className="btn-secondary flex-1">
                Copiar link
              </button>
            </div>
            <button onClick={onClose} className="btn-primary">
              Concluir
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button onClick={enviarWhatsapp} disabled={!podeEnviar} className="btn-primary">
              💬 Enviar pelo WhatsApp
            </button>
            <div className="flex gap-2">
              <button onClick={enviarEmail} disabled={!podeEnviar} className="btn-secondary flex-1">
                ✉️ E-mail
              </button>
              <button onClick={copiarLink} disabled={!podeEnviar} className="btn-secondary flex-1">
                🔗 Copiar link
              </button>
            </div>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-4">
        {offers.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-bold text-brand-500">Do seu catálogo</p>
            <div className="flex flex-wrap gap-1.5">
              {offers.map((o) => (
                <button
                  key={o.id}
                  onClick={() => aplicarOferta(o)}
                  className={clsx(
                    "rounded-full px-3 py-1.5 text-xs font-bold",
                    title === o.title ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-600"
                  )}
                >
                  {OFFER_KIND_ICONS[o.kind]} {o.title} · {formatMoney(o.price)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="mb-1 text-xs font-bold text-brand-500">Para quem</p>
          {patients.length > 0 && (
            <select
              value={patientId}
              onChange={(e) => {
                setPatientId(e.target.value);
                const p = patients.find((x) => x.id === e.target.value);
                if (p) setPatientName(p.nome);
                setPatientEmail("");
              }}
              className="input-field mb-2"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
              <option value="">Outra pessoa (ainda não é paciente)</option>
            </select>
          )}
          {!patientId && (
            <input
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Nome de quem vai receber"
              className="input-field mb-2"
            />
          )}
          <input
            value={patientEmail}
            onChange={(e) => setPatientEmail(e.target.value)}
            placeholder="E-mail (opcional, só para enviar por e-mail)"
            inputMode="email"
            className="input-field"
          />
        </div>

        <div>
          <p className="mb-1 text-xs font-bold text-brand-500">O que está oferecendo</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Pacote mensal — 4 sessões"
            className="input-field mb-2"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Em uma frase, o que a pessoa ganha com isso."
            className="input-field resize-none text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Campo label="Sessões">
            <input
              type="number"
              min={0}
              value={sessions}
              onChange={(e) => setSessions(Number(e.target.value))}
              className="input-field"
            />
          </Campo>
          <Campo label="Valor (R$)">
            <input
              type="number"
              min={0}
              step={10}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="input-field"
            />
          </Campo>
          <Campo label="De (R$, opcional)">
            <input
              type="number"
              min={0}
              step={10}
              value={listPrice}
              onChange={(e) => setListPrice(Number(e.target.value))}
              className="input-field"
            />
          </Campo>
          <Campo label="Parcelas">
            <input
              type="number"
              min={1}
              max={12}
              value={installments}
              onChange={(e) => setInstallments(Number(e.target.value))}
              className="input-field"
            />
          </Campo>
          <Campo label="Prazo de uso (dias)">
            <input
              type="number"
              min={0}
              value={validityDays}
              onChange={(e) => setValidityDays(Number(e.target.value))}
              className="input-field"
            />
          </Campo>
          <Campo label="Vale até">
            <input
              type="date"
              value={validUntil}
              min={todayKey()}
              onChange={(e) => setValidUntil(e.target.value)}
              className="input-field"
            />
          </Campo>
        </div>

        {price > 0 && (
          <div className="rounded-2xl bg-cream-100 p-3 text-xs text-brand-600">
            {porSessao && (
              <p>
                Sai a <span className="font-bold text-brand-800">{formatMoney(porSessao)}</span> por
                sessão.
              </p>
            )}
            {desconto && <p className="mt-0.5">Desconto de {desconto}% sobre o valor cheio.</p>}
            {installments > 1 && (
              <p className="mt-0.5">{installments}x de {formatMoney(price / installments)}.</p>
            )}
          </div>
        )}

        <div>
          <p className="mb-1 text-xs font-bold text-brand-500">Mensagem que vai sair</p>
          <pre className="whitespace-pre-wrap rounded-2xl bg-brand-50/70 p-3 font-sans text-xs leading-relaxed text-brand-700">
            {mensagem}
          </pre>
          <p className="mt-1 text-[11px] text-brand-400">
            Você confere e envia pelo seu próprio aplicativo. O ROTA não dispara nada sozinho.
          </p>
        </div>
      </div>
    </BottomSheet>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-bold text-brand-500">{label}</p>
      {children}
    </div>
  );
}
