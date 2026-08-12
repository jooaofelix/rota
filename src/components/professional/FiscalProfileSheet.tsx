import { useEffect, useState } from "react";
import clsx from "clsx";
import { BottomSheet } from "@/components/common/BottomSheet";
import { useToast } from "@/contexts/ToastContext";
import { fiscalGaps, saveFiscalProfile, subscribeToFiscalProfile } from "@/services/fiscal";
import type { FiscalProfileDoc, FiscalRegime } from "@/types";

const REGIMES: Array<{ key: FiscalRegime; label: string; detalhe: string }> = [
  { key: "pj_simples", label: "Empresa no Simples", detalhe: "ME ou EPP optante pelo Simples Nacional." },
  { key: "mei", label: "MEI", detalhe: "Microempreendedora individual." },
  { key: "pj_outro", label: "Empresa, outro regime", detalhe: "Lucro presumido ou real." },
  { key: "autonomo", label: "Autônoma (CPF)", detalhe: "Profissional liberal, sem CNPJ." },
];

/**
 * Cadastro fiscal.
 *
 * Não serve para preencher formulário bonito: serve para a emissão travar aqui,
 * onde dá para resolver, e não na hora de mandar a nota. A lista do que falta
 * sai pronta para levar ao contador.
 */
export function FiscalProfileSheet({ uid, onClose }: { uid: string; onClose: () => void }) {
  const { showToast } = useToast();
  const [perfil, setPerfil] = useState<FiscalProfileDoc | null>(null);
  const [form, setForm] = useState<Partial<FiscalProfileDoc>>({ regime: "indefinido" });
  const [carregado, setCarregado] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(
    () =>
      subscribeToFiscalProfile(uid, (p) => {
        setPerfil(p);
        if (!carregado) {
          setForm(p ?? { regime: "indefinido" });
          setCarregado(true);
        }
      }),
    [uid, carregado]
  );

  function set<K extends keyof FiscalProfileDoc>(key: K, value: FiscalProfileDoc[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function salvar() {
    setSaving(true);
    try {
      await saveFiscalProfile(uid, form);
      showToast("Dados fiscais salvos.");
      onClose();
    } catch {
      showToast("Não deu para salvar agora.");
    } finally {
      setSaving(false);
    }
  }

  const pj = form.regime === "pj_simples" || form.regime === "pj_outro" || form.regime === "mei";
  const faltando = fiscalGaps({ ...(perfil ?? {}), ...form } as FiscalProfileDoc);

  return (
    <BottomSheet
      open
      onClose={onClose}
      title="Dados fiscais"
      footer={
        <button onClick={salvar} disabled={saving} className="btn-primary">
          {saving ? "Salvando..." : "Salvar"}
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="rounded-2xl bg-cream-100 p-3 text-xs leading-relaxed text-brand-600">
          Estes dados ficam só com você — coleção separada, que nenhum paciente lê. São os mesmos
          que a emissão de nota e o recibo exigem.
        </p>

        <div>
          <p className="mb-1.5 text-xs font-bold text-brand-500">Como você emite</p>
          <div className="flex flex-col gap-1.5">
            {REGIMES.map((r) => (
              <button
                key={r.key}
                onClick={() => set("regime", r.key)}
                className={clsx(
                  "rounded-2xl border-2 p-3 text-left",
                  form.regime === r.key ? "border-brand-500 bg-brand-50" : "border-brand-100"
                )}
              >
                <p className="text-sm font-bold text-brand-800">{r.label}</p>
                <p className="text-xs text-brand-400">{r.detalhe}</p>
              </button>
            ))}
          </div>
        </div>

        <Campo label={pj ? "Razão social" : "Nome civil completo"}>
          <input
            value={form.legalName ?? ""}
            onChange={(e) => set("legalName", e.target.value)}
            className="input-field"
          />
        </Campo>

        {pj ? (
          <Campo label="CNPJ">
            <input
              value={form.cnpj ?? ""}
              onChange={(e) => set("cnpj", e.target.value)}
              inputMode="numeric"
              placeholder="00.000.000/0000-00"
              className="input-field"
            />
          </Campo>
        ) : (
          <Campo label="CPF">
            <input
              value={form.cpf ?? ""}
              onChange={(e) => set("cpf", e.target.value)}
              inputMode="numeric"
              placeholder="000.000.000-00"
              className="input-field"
            />
          </Campo>
        )}

        <Campo label="Inscrição municipal (CCM)">
          <input
            value={form.inscricaoMunicipal ?? ""}
            onChange={(e) => set("inscricaoMunicipal", e.target.value)}
            className="input-field"
          />
        </Campo>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <Campo label="Município">
              <input
                value={form.municipio ?? ""}
                onChange={(e) => set("municipio", e.target.value)}
                placeholder="São José dos Campos"
                className="input-field"
              />
            </Campo>
          </div>
          <Campo label="UF">
            <input
              value={form.uf ?? ""}
              onChange={(e) => set("uf", e.target.value.toUpperCase().slice(0, 2))}
              placeholder="SP"
              className="input-field"
            />
          </Campo>
        </div>

        <Campo label="Endereço do atendimento">
          <input
            value={form.enderecoLinha1 ?? ""}
            onChange={(e) => set("enderecoLinha1", e.target.value)}
            placeholder="Rua, número, sala, bairro"
            className="input-field"
          />
        </Campo>

        <div className="grid grid-cols-2 gap-2">
          <Campo label="Código do serviço">
            <input
              value={form.codigoServico ?? ""}
              onChange={(e) => set("codigoServico", e.target.value)}
              placeholder="4.16"
              className="input-field"
            />
          </Campo>
          <Campo label="ISS (%)">
            <input
              type="number"
              min={0}
              step={0.5}
              value={form.issAliquota ?? 0}
              onChange={(e) => set("issAliquota", Number(e.target.value))}
              className="input-field"
            />
          </Campo>
        </div>

        <Campo label="Descrição padrão do serviço">
          <textarea
            value={form.descricaoPadrao ?? ""}
            onChange={(e) => set("descricaoPadrao", e.target.value)}
            rows={2}
            placeholder="Atendimento psicológico"
            className="input-field resize-none text-sm"
          />
        </Campo>

        <div className={clsx("rounded-2xl p-3", faltando.length ? "bg-amber-50" : "bg-emerald-50")}>
          <p className={clsx("text-xs font-bold", faltando.length ? "text-amber-700" : "text-emerald-700")}>
            {faltando.length ? "Ainda falta para conseguir emitir" : "Cadastro completo"}
          </p>
          {faltando.length > 0 ? (
            <ul className="mt-1 flex flex-col gap-0.5">
              {faltando.map((f) => (
                <li key={f} className="text-xs leading-snug text-amber-700">
                  • {f}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-0.5 text-xs text-emerald-700">
              Os dados que a nota exige estão preenchidos.
            </p>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-bold text-brand-500">{label}</p>
      {children}
    </div>
  );
}
