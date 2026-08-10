import { useState } from "react";
import { BottomSheet } from "@/components/common/BottomSheet";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";
import { removeOffer, saveOffer } from "@/services/offers";
import type { OfferDoc, OfferKind } from "@/types";
import { formatMoney } from "@/utils/agenda";
import {
  OFFER_KIND_ICONS,
  OFFER_KIND_LABELS,
  OFFER_TEMPLATES,
  discountPercent,
  pricePerSession,
  type OfferTemplate,
} from "@/utils/proposals";

/**
 * O catálogo: o que ela vende, escrito uma vez.
 *
 * Vem com modelos prontos porque a parte difícil não é preencher o formulário —
 * é decidir o que oferecer. Cada modelo diz para que serve, e os valores são um
 * ponto de partida que ela ajusta antes de salvar.
 */
export function OfferCatalogSheet({
  professionalId,
  offers,
  onClose,
}: {
  professionalId: string;
  offers: OfferDoc[];
  onClose: () => void;
}) {
  const [editing, setEditing] = useState<OfferDoc | OfferTemplate | "new" | null>(null);
  const [removendo, setRemovendo] = useState<OfferDoc | null>(null);
  const { showToast } = useToast();

  if (editing) {
    return (
      <OfferForm
        professionalId={professionalId}
        existing={typeof editing === "object" && "id" in editing ? editing : undefined}
        seed={typeof editing === "object" && !("id" in editing) ? editing : undefined}
        onClose={onClose}
        onBack={() => setEditing(null)}
      />
    );
  }

  const jaTem = new Set(offers.map((o) => o.title));

  return (
    <>
      <BottomSheet
        open
        onClose={onClose}
        title="O que você vende"
        footer={
          <button onClick={() => setEditing("new")} className="btn-primary">
            + Criar do zero
          </button>
        }
      >
        <div className="flex flex-col gap-4">
          {offers.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-bold text-brand-500">No seu catálogo</p>
              <div className="flex flex-col">
                {offers.map((o) => {
                  const desconto = discountPercent(o.price, o.listPrice);
                  const porSessao = pricePerSession(o.price, o.sessions);
                  return (
                    <div key={o.id} className="flex items-start gap-2.5 border-b border-brand-50 py-2.5 last:border-b-0">
                      <span className="text-lg leading-none">{OFFER_KIND_ICONS[o.kind]}</span>
                      <button onClick={() => setEditing(o)} className="min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-bold text-brand-800">{o.title}</p>
                        <p className="text-xs text-brand-400">
                          {formatMoney(o.price)}
                          {porSessao && o.sessions > 1 && ` · ${formatMoney(porSessao)}/sessão`}
                          {desconto && ` · −${desconto}%`}
                        </p>
                      </button>
                      <button
                        onClick={() => setRemovendo(o)}
                        className="shrink-0 text-xs font-bold text-rose-500"
                      >
                        Remover
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <p className="mb-1 text-xs font-bold text-brand-500">Modelos prontos</p>
            <p className="mb-2 text-[11px] leading-snug text-brand-400">
              Toque para abrir já preenchido. Os valores são só um ponto de partida — ajuste antes
              de salvar.
            </p>
            <div className="flex flex-col gap-2">
              {OFFER_TEMPLATES.map((t) => (
                <button
                  key={t.title}
                  onClick={() => setEditing(t)}
                  disabled={jaTem.has(t.title)}
                  className="rounded-2xl border-2 border-brand-100 p-3 text-left disabled:opacity-40"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-bold text-brand-800">
                      {OFFER_KIND_ICONS[t.kind]} {t.title}
                    </p>
                    <p className="shrink-0 text-xs font-extrabold text-brand-600">
                      {formatMoney(t.price)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs leading-snug text-brand-500">{t.quando}</p>
                  {jaTem.has(t.title) && (
                    <p className="mt-1 text-[11px] font-bold text-brand-400">Já está no catálogo</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={!!removendo}
        title="Remover do catálogo?"
        description="As propostas já enviadas continuam valendo — elas guardam a própria cópia dos valores."
        confirmLabel="Remover"
        danger
        onConfirm={async () => {
          if (removendo) await removeOffer(removendo.id);
          setRemovendo(null);
          showToast("Removido do catálogo.");
        }}
        onCancel={() => setRemovendo(null)}
      />
    </>
  );
}

const KINDS: OfferKind[] = ["package", "monthly", "single", "assessment", "intensive", "gift", "other"];

function OfferForm({
  professionalId,
  existing,
  seed,
  onClose,
  onBack,
}: {
  professionalId: string;
  existing?: OfferDoc;
  seed?: OfferTemplate;
  onClose: () => void;
  onBack: () => void;
}) {
  const base = existing ?? seed;
  const { showToast } = useToast();
  const [title, setTitle] = useState(base?.title ?? "");
  const [description, setDescription] = useState(base?.description ?? "");
  const [kind, setKind] = useState<OfferKind>(base?.kind ?? "package");
  const [sessions, setSessions] = useState(base?.sessions ?? 4);
  const [price, setPrice] = useState(base?.price ?? 0);
  const [listPrice, setListPrice] = useState(base?.listPrice ?? 0);
  const [installments, setInstallments] = useState(base?.installments ?? 1);
  const [validityDays, setValidityDays] = useState(base?.validityDays ?? 0);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim() || price <= 0) return;
    setSaving(true);
    try {
      await saveOffer(existing?.id ?? null, {
        professionalId,
        title: title.trim(),
        description: description.trim() || undefined,
        kind,
        sessions,
        price,
        listPrice: listPrice > price ? listPrice : undefined,
        installments: installments > 1 ? installments : undefined,
        validityDays: validityDays > 0 ? validityDays : undefined,
      });
      showToast("Salvo no catálogo.");
      onBack();
    } catch {
      showToast("Não deu para salvar agora.");
    } finally {
      setSaving(false);
    }
  }

  const porSessao = pricePerSession(price, sessions);
  const desconto = discountPercent(price, listPrice);

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={existing ? "Editar oferta" : "Nova oferta"}
      footer={
        <div className="flex gap-2">
          <button onClick={onBack} className="btn-secondary flex-1">
            Voltar
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || price <= 0 || saving}
            className="btn-primary flex-1"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div>
          <p className="mb-1 text-xs font-bold text-brand-500">Tipo</p>
          <div className="flex flex-wrap gap-1.5">
            {KINDS.map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={
                  kind === k
                    ? "rounded-full bg-brand-500 px-3 py-1.5 text-xs font-bold text-white"
                    : "rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-600"
                }
              >
                {OFFER_KIND_ICONS[k]} {OFFER_KIND_LABELS[k]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-bold text-brand-500">Nome</p>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" />
        </div>

        <div>
          <p className="mb-1 text-xs font-bold text-brand-500">Descrição</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="input-field resize-none text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 text-[11px] font-bold text-brand-500">Sessões</p>
            <input type="number" min={0} value={sessions} onChange={(e) => setSessions(Number(e.target.value))} className="input-field" />
          </div>
          <div>
            <p className="mb-1 text-[11px] font-bold text-brand-500">Valor (R$)</p>
            <input type="number" min={0} step={10} value={price} onChange={(e) => setPrice(Number(e.target.value))} className="input-field" />
          </div>
          <div>
            <p className="mb-1 text-[11px] font-bold text-brand-500">De (R$, opcional)</p>
            <input type="number" min={0} step={10} value={listPrice} onChange={(e) => setListPrice(Number(e.target.value))} className="input-field" />
          </div>
          <div>
            <p className="mb-1 text-[11px] font-bold text-brand-500">Parcelas</p>
            <input type="number" min={1} max={12} value={installments} onChange={(e) => setInstallments(Number(e.target.value))} className="input-field" />
          </div>
          <div>
            <p className="mb-1 text-[11px] font-bold text-brand-500">Prazo de uso (dias)</p>
            <input type="number" min={0} value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value))} className="input-field" />
          </div>
        </div>

        {price > 0 && (
          <div className="rounded-2xl bg-cream-100 p-3 text-xs text-brand-600">
            {porSessao && sessions > 1 && (
              <p>
                Sai a <span className="font-bold text-brand-800">{formatMoney(porSessao)}</span> por
                sessão.
              </p>
            )}
            {desconto && <p className="mt-0.5">Desconto de {desconto}% sobre o valor cheio.</p>}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
