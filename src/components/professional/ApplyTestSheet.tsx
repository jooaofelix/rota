import { useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { BottomSheet } from "@/components/common/BottomSheet";
import { useToast } from "@/contexts/ToastContext";
import { INSTRUMENTOS, type Instrumento } from "@/data/instruments";
import { criarAplicacao, registrarResultado } from "@/services/assessments";
import { assessmentLink, novoTokenDeTeste } from "@/utils/assessments";
import { firstName } from "@/utils/proposals";

type Passo = "escolher" | "detalhe";

/**
 * Aplicar teste.
 *
 * Três caminhos, porque são três situações reais: responder aqui (ela passa o
 * celular na sessão, ou abre no computador do consultório), mandar o link para
 * a pessoa responder em casa, e registrar o resultado de um instrumento que foi
 * aplicado fora — que é o único caminho possível para os de uso restrito.
 */
export function ApplyTestSheet({
  professionalId,
  professionalName,
  patientId,
  patientName,
  onClose,
}: {
  professionalId: string;
  professionalName: string;
  patientId: string;
  patientName: string;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [passo, setPasso] = useState<Passo>("escolher");
  const [escolhido, setEscolhido] = useState<Instrumento | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [nomeLivre, setNomeLivre] = useState("");
  const [observacao, setObservacao] = useState("");

  function escolher(instrumento: Instrumento) {
    setEscolhido(instrumento);
    setValores({});
    setNomeLivre("");
    setObservacao("");
    setPasso("detalhe");
  }

  async function aplicarAgora() {
    if (!escolhido) return;
    setSalvando(true);
    try {
      const token = novoTokenDeTeste();
      await criarAplicacao(token, {
        professionalId,
        professionalName,
        patientId,
        patientName,
        instrumento: escolhido,
        origem: "aplicado",
      });
      navigate(`/teste/${token}`);
    } catch {
      showToast("Não consegui abrir o teste. Tente de novo.", "error");
      setSalvando(false);
    }
  }

  async function enviarLink() {
    if (!escolhido) return;
    setSalvando(true);
    try {
      const token = novoTokenDeTeste();
      await criarAplicacao(token, {
        professionalId,
        professionalName,
        patientId,
        patientName,
        instrumento: escolhido,
        origem: "enviado",
      });
      const texto = `Oi, ${firstName(patientName)}! Preparei um questionário rápido (${escolhido.minutos} min) para a gente conversar na próxima sessão. É só responder por aqui: ${assessmentLink(token)}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
      showToast("Link criado. Ele aparece como pendente até a pessoa responder.");
      onClose();
    } catch {
      showToast("Não consegui criar o link. Tente de novo.", "error");
      setSalvando(false);
    }
  }

  async function salvarRegistro() {
    if (!escolhido?.campos) return;
    const numeros: Record<string, number> = {};
    for (const campo of escolhido.campos) {
      const bruto = (valores[campo.id] ?? "").replace(",", ".");
      const n = Number(bruto);
      if (bruto === "" || !Number.isFinite(n)) {
        showToast(`Preencha ${campo.nome.toLowerCase()}.`, "error");
        return;
      }
      numeros[campo.id] = Math.min(campo.max, Math.max(campo.min, n));
    }
    if (escolhido.id === "registro-livre" && !nomeLivre.trim()) {
      showToast("Diga qual instrumento foi aplicado.", "error");
      return;
    }

    setSalvando(true);
    try {
      await registrarResultado(novoTokenDeTeste(), {
        professionalId,
        professionalName,
        patientId,
        patientName,
        instrumento: escolhido,
        instrumentoLivre: escolhido.id === "registro-livre" ? nomeLivre : undefined,
        valores: numeros,
        observacao,
      });
      showToast("Resultado registrado no histórico.");
      onClose();
    } catch {
      showToast("Não consegui registrar. Tente de novo.", "error");
      setSalvando(false);
    }
  }

  if (passo === "escolher") {
    return (
      <BottomSheet open onClose={onClose} title="Aplicar teste">
        <div className="flex flex-col gap-2">
          {INSTRUMENTOS.map((i) => (
            <button
              key={i.id}
              onClick={() => escolher(i)}
              className="flex items-start gap-3 rounded-2xl bg-cream-50 p-3 text-left"
            >
              <span className="text-2xl">{i.icone}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-1.5">
                  <span className="truncate text-sm font-bold text-brand-800">{i.nome}</span>
                  <span className="shrink-0 text-[11px] font-bold text-brand-300">{i.sigla}</span>
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-brand-500">{i.resumo}</span>
                <span className="mt-1 block text-[11px] font-bold text-brand-400">
                  {i.somenteRegistro ? "Registro do resultado" : `~${i.minutos} min`}
                </span>
              </span>
            </button>
          ))}
          <p className="mt-1 text-[11px] leading-snug text-brand-400">
            Testes de uso restrito (BFP, BAI, BDI-II, Wechsler) têm itens protegidos por direito autoral
            e aplicação vinculada ao material da editora — não podem ser reproduzidos em aplicativo.
            Aplique pelo material oficial e registre o resultado aqui.
          </p>
        </div>
      </BottomSheet>
    );
  }

  const i = escolhido!;

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={i.nome}
      footer={
        i.somenteRegistro ? (
          <button onClick={salvarRegistro} disabled={salvando} className="btn-primary">
            {salvando ? "Registrando..." : "Registrar resultado"}
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <button onClick={aplicarAgora} disabled={salvando} className="btn-primary">
              Responder agora, aqui
            </button>
            <button onClick={enviarLink} disabled={salvando} className="btn-secondary">
              Enviar link para {firstName(patientName)}
            </button>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-3">
        <button onClick={() => setPasso("escolher")} className="self-start text-xs font-bold text-brand-400">
          ← Escolher outro
        </button>

        <p className="text-sm leading-relaxed text-brand-600">{i.sobre}</p>

        <p className="rounded-xl bg-cream-100 p-2.5 text-[11px] leading-snug text-brand-500">{i.fonte}</p>

        {i.somenteRegistro ? (
          <div className="flex flex-col gap-3">
            {i.id === "registro-livre" && (
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold text-brand-700">Qual instrumento?</span>
                <input
                  value={nomeLivre}
                  onChange={(e) => setNomeLivre(e.target.value)}
                  placeholder="Ex.: BAI — Inventário de Ansiedade de Beck"
                  className="input-field"
                />
              </label>
            )}
            {i.campos!.map((campo) => (
              <label key={campo.id} className="flex flex-col gap-1">
                <span className="text-xs font-bold text-brand-700">
                  {campo.nome}
                  {campo.sufixo ? <span className="font-normal text-brand-400"> ({campo.sufixo})</span> : null}
                </span>
                <input
                  inputMode="decimal"
                  value={valores[campo.id] ?? ""}
                  onChange={(e) => setValores((prev) => ({ ...prev, [campo.id]: e.target.value }))}
                  placeholder={`${campo.min} a ${campo.max}`}
                  className="input-field"
                />
                {campo.ajuda && <span className="text-[11px] text-brand-400">{campo.ajuda}</span>}
              </label>
            ))}
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold text-brand-700">Leitura clínica (opcional)</span>
              <textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                rows={3}
                placeholder="O que esse resultado significou no caso dela."
                className="input-field resize-none"
              />
            </label>
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-cream-50 p-3">
              <p className="text-xs font-bold text-brand-700">
                {i.itens?.length} {i.itens?.length === 1 ? "pergunta" : "perguntas"} · ~{i.minutos} min
              </p>
              <p className="mt-1 text-xs leading-snug text-brand-500">
                <strong>Responder agora</strong> abre o teste nesta tela — passe o aparelho ou use o
                computador. <strong>Enviar link</strong> abre o WhatsApp com um link pessoal; a pessoa
                responde quando puder e o resultado cai aqui.
              </p>
            </div>
            <ul className="flex flex-col gap-1">
              {i.itens?.slice(0, 3).map((item, idx) => (
                <li key={idx} className="text-[11px] leading-snug text-brand-400">
                  {idx + 1}. {item.texto}
                </li>
              ))}
              {(i.itens?.length ?? 0) > 3 && (
                <li className="text-[11px] text-brand-300">
                  + {(i.itens?.length ?? 0) - 3} outras
                </li>
              )}
            </ul>
          </>
        )}
      </div>
    </BottomSheet>
  );
}

/** Reaproveitado pela aba de testes para pintar o chip da faixa. */
export function tomClasse(tom: string | undefined): string {
  return clsx(
    tom === "alerta" && "bg-rose-50 text-rose-700",
    tom === "atencao" && "bg-amber-50 text-amber-700",
    (tom === "ok" || !tom) && "bg-emerald-50 text-emerald-700"
  );
}
