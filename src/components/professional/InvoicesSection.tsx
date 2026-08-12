import { useEffect, useState } from "react";
import clsx from "clsx";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { subscribeToInvoices, emitirNota } from "@/services/invoices";
import { fiscalGaps, subscribeToFiscalProfile } from "@/services/fiscal";
import type { FiscalProfileDoc, InvoiceDoc, InvoiceStatus } from "@/types";
import { formatMoney } from "@/utils/agenda";
import { formatShortDate } from "@/utils/date";

const ESTADO: Record<InvoiceStatus, { rotulo: string; emoji: string; estilo: string }> = {
  rascunho: { rotulo: "Rascunho", emoji: "📝", estilo: "bg-brand-100 text-brand-600" },
  enviando: { rotulo: "Processando", emoji: "⏳", estilo: "bg-amber-100 text-amber-700" },
  emitida: { rotulo: "Emitida", emoji: "🧾", estilo: "bg-emerald-100 text-emerald-700" },
  erro: { rotulo: "Recusada", emoji: "⚠️", estilo: "bg-rose-100 text-rose-700" },
  cancelada: { rotulo: "Cancelada", emoji: "🚫", estilo: "bg-cream-200 text-brand-500" },
};

/**
 * As notas fiscais.
 *
 * O rascunho é dela; a partir do "emitir", quem manda é a prefeitura, e a tela
 * só conta o que aconteceu. Por isso nada aqui promete: enquanto o número não
 * volta, o estado é "processando", e não "emitida".
 */
export function InvoicesSection() {
  const { firebaseUser } = useAuth();
  const { showToast } = useToast();
  const [notas, setNotas] = useState<InvoiceDoc[]>([]);
  const [fiscal, setFiscal] = useState<FiscalProfileDoc | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeToInvoices(firebaseUser.uid, setNotas);
  }, [firebaseUser]);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeToFiscalProfile(firebaseUser.uid, setFiscal);
  }, [firebaseUser]);

  const faltando = fiscalGaps(fiscal);
  const pronta = faltando.length === 0;

  async function emitir(nota: InvoiceDoc) {
    setEnviando(nota.id);
    try {
      const r = await emitirNota(nota.id);
      showToast(r.ok ? "Pedido enviado. O número volta em instantes." : r.erro ?? "Não deu para emitir.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Não deu para emitir agora.");
    } finally {
      setEnviando(null);
    }
  }

  return (
    <div className="card">
      <p className="mb-1 text-sm font-bold text-brand-700">Notas fiscais</p>

      {!pronta && (
        <div className="mb-3 rounded-2xl bg-amber-50 p-3">
          <p className="text-xs font-bold text-amber-700">Cadastro fiscal incompleto</p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {faltando.slice(0, 3).map((f) => (
              <li key={f} className="text-xs leading-snug text-amber-700">
                • {f}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[11px] text-amber-600">Preencha em Perfil › Dados fiscais.</p>
        </div>
      )}

      {notas.length === 0 ? (
        <p className="text-xs leading-relaxed text-brand-400">
          Nenhuma nota ainda. Abra um atendimento pago na agenda e escolha "Emitir nota" — o rascunho
          nasce com os dados da sessão e só é transmitido quando você mandar.
        </p>
      ) : (
        <div className="flex flex-col">
          {notas.slice(0, 12).map((n) => {
            const e = ESTADO[n.status];
            return (
              <div key={n.id} className="flex items-start gap-2.5 border-b border-brand-50 py-2.5 last:border-b-0">
                <span className="text-lg leading-none">{e.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-brand-800">
                    {n.patientName} · {formatMoney(n.value)}
                  </p>
                  <p className="truncate text-xs text-brand-400">
                    {formatShortDate(n.competencia)}
                    {n.numero ? ` · nº ${n.numero}` : ""}
                  </p>
                  {n.erro && (
                    <p className="mt-1 rounded-lg bg-rose-50 px-2 py-1 text-xs leading-snug text-rose-600">
                      {n.erro}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-3">
                    {(n.status === "rascunho" || n.status === "erro") && (
                      <button
                        onClick={() => emitir(n)}
                        disabled={!pronta || enviando === n.id}
                        className="text-[11px] font-bold text-brand-500 disabled:opacity-40"
                      >
                        {enviando === n.id ? "Enviando..." : n.status === "erro" ? "Tentar de novo" : "Emitir"}
                      </button>
                    )}
                    {n.linkPdf && (
                      <a
                        href={n.linkPdf}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-brand-500"
                      >
                        Abrir PDF
                      </a>
                    )}
                  </div>
                </div>
                <span className={clsx("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", e.estilo)}>
                  {e.rotulo}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
