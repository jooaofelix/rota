import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useAuth } from "@/contexts/AuthContext";
import { getLinkedPatientsBasics } from "@/services/patients";
import { subscribeToProfessionalRecords } from "@/services/sessions";
import type { SessionRecordDoc } from "@/types";
import { TopBar } from "@/components/common/TopBar";
import { EmptyState } from "@/components/common/EmptyState";
import { formatShortDate } from "@/utils/date";

const RecordPdfLink = lazy(() =>
  import("@/components/professional/RecordPdfLink").then((m) => ({ default: m.RecordPdfLink }))
);

/**
 * Todos os prontuários num lugar só, agrupados por paciente. Antes o registro só
 * era alcançável pela sessão que o originou, o que obrigava a caçar a data na
 * agenda para reler o que foi escrito.
 */
export function RecordsPage() {
  const { firebaseUser, userDoc } = useAuth();
  const [records, setRecords] = useState<SessionRecordDoc[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeToProfessionalRecords(firebaseUser.uid, setRecords);
  }, [firebaseUser]);

  useEffect(() => {
    if (!firebaseUser) return;
    let vivo = true;
    // Só o nome de cada um, para dar título aos prontuários. A visão completa do
    // painel varreria rotina e cumprimentos de todo mundo para nada.
    getLinkedPatientsBasics(firebaseUser.uid)
      .then((lista) => vivo && setNames(Object.fromEntries(lista.map((p) => [p.id, p.name]))))
      .catch(() => vivo && setNames({}));
    return () => {
      vivo = false;
    };
  }, [firebaseUser]);

  const porPaciente = useMemo(() => {
    const grupos = new Map<string, SessionRecordDoc[]>();
    records.forEach((r) => grupos.set(r.patientId, [...(grupos.get(r.patientId) ?? []), r]));
    return Array.from(grupos.entries())
      .map(([patientId, itens]) => ({
        patientId,
        nome: names[patientId] ?? "Paciente",
        itens,
        ultimo: itens[0]?.date,
        emAberto: itens.filter((i) => !i.signedAt).length,
        risco: itens.some((i) => i.riskFlag),
      }))
      .filter((g) => g.nome.toLowerCase().includes(busca.toLowerCase()))
      .sort((a, b) => (b.ultimo ?? "").localeCompare(a.ultimo ?? ""));
  }, [records, names, busca]);

  return (
    <div>
      <TopBar title="Prontuários" subtitle="Registros clínicos por paciente" />

      <div className="flex flex-col gap-3 px-4 pb-4">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome..."
          className="input-field"
        />

        {porPaciente.length === 0 ? (
          <EmptyState
            icon="📓"
            title="Nenhum registro ainda"
            description="Os registros aparecem aqui assim que você escrever o primeiro, pela sessão na agenda."
          />
        ) : (
          porPaciente.map((g) => (
            <div key={g.patientId} className="card">
              <button
                onClick={() => setAberto(aberto === g.patientId ? null : g.patientId)}
                className="flex w-full items-center gap-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-brand-800">{g.nome}</p>
                  <p className="text-xs text-brand-400">
                    {g.itens.length} {g.itens.length === 1 ? "registro" : "registros"}
                    {g.ultimo && ` · último em ${formatShortDate(g.ultimo)}`}
                  </p>
                </div>
                {g.risco && <span className="shrink-0 text-sm" title="Há registro com atenção a risco">🚩</span>}
                {g.emAberto > 0 && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                    {g.emAberto} em aberto
                  </span>
                )}
                <span className="shrink-0 text-brand-300">{aberto === g.patientId ? "▴" : "▾"}</span>
              </button>

              {aberto === g.patientId && (
                <div className="mt-3 flex flex-col gap-2 border-t border-brand-50 pt-3">
                  {g.itens.map((r) => (
                    <div
                      key={r.id}
                      className={clsx(
                        "rounded-xl p-2.5",
                        r.riskFlag ? "bg-rose-50" : "bg-brand-50/60"
                      )}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-brand-700">{formatShortDate(r.date)}</p>
                        <span className="text-[11px] font-bold text-brand-400">
                          {r.signedAt ? "encerrado" : "em aberto"}
                        </span>
                      </div>
                      <p className="line-clamp-3 text-xs leading-snug text-brand-600">{r.evolution}</p>
                    </div>
                  ))}

                  <Suspense fallback={<p className="text-center text-xs text-brand-400">Preparando PDF...</p>}>
                    <RecordPdfLink
                      patientName={g.nome}
                      professionalName={userDoc?.name ?? "Profissional"}
                      records={[...g.itens].sort((a, b) => a.date.localeCompare(b.date))}
                      fileName={`prontuario-${g.nome.toLowerCase().replace(/\s+/g, "-")}.pdf`}
                      label="⬇ Exportar prontuário completo"
                    />
                  </Suspense>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
