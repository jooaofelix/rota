import { useEffect, useState } from "react";
import clsx from "clsx";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";
import { acharInstrumento } from "@/data/instruments";
import { removerAplicacao, salvarObservacao, subscribeToAssessments } from "@/services/assessments";
import type { AssessmentDoc } from "@/types";
import { assessmentLink, escoreApresentado, variacao } from "@/utils/assessments";
import { ApplyTestSheet, tomClasse } from "@/components/professional/ApplyTestSheet";

/**
 * Testes aplicados a um paciente.
 *
 * A lista é cronológica de propósito: o valor de uma escala não está no número
 * de hoje, está na diferença para a última vez. Por isso cada resultado mostra
 * de onde veio.
 */
export function AssessmentsTab({
  professionalId,
  professionalName,
  patientId,
  patientName,
}: {
  professionalId: string;
  professionalName: string;
  patientId: string;
  patientName: string;
}) {
  const { showToast } = useToast();
  const [itens, setItens] = useState<AssessmentDoc[]>([]);
  const [aplicando, setAplicando] = useState(false);
  const [apagando, setApagando] = useState<AssessmentDoc | null>(null);

  useEffect(
    () => subscribeToAssessments(professionalId, patientId, setItens),
    [professionalId, patientId]
  );

  async function copiarLink(token: string) {
    await navigator.clipboard.writeText(assessmentLink(token));
    showToast("Link copiado.");
  }

  return (
    <div className="flex flex-col gap-3">
      <button onClick={() => setAplicando(true)} className="btn-primary">
        + Aplicar teste
      </button>

      {itens.length === 0 ? (
        <EmptyState
          icon="🧭"
          title="Nenhum teste aplicado"
          description="Aplique aqui na sessão, mande o link para responder em casa, ou registre o resultado de um teste feito no papel."
        />
      ) : (
        itens.map((a) => (
          <Cartao
            key={a.id}
            aplicacao={a}
            historico={itens}
            onCopiarLink={() => copiarLink(a.id)}
            onApagar={() => setApagando(a)}
            onObservacao={(texto) => salvarObservacao(a.id, texto)}
          />
        ))
      )}

      {aplicando && (
        <ApplyTestSheet
          professionalId={professionalId}
          professionalName={professionalName}
          patientId={patientId}
          patientName={patientName}
          onClose={() => setAplicando(false)}
        />
      )}

      <ConfirmDialog
        open={!!apagando}
        title="Apagar esta aplicação?"
        description="O resultado sai do histórico e não volta. Se o teste ainda está pendente, o link deixa de funcionar."
        confirmLabel="Apagar"
        onCancel={() => setApagando(null)}
        onConfirm={async () => {
          if (apagando) await removerAplicacao(apagando.id);
          setApagando(null);
          showToast("Aplicação apagada.");
        }}
      />
    </div>
  );
}

function Cartao({
  aplicacao,
  historico,
  onCopiarLink,
  onApagar,
  onObservacao,
}: {
  aplicacao: AssessmentDoc;
  historico: AssessmentDoc[];
  onCopiarLink: () => void;
  onApagar: () => void;
  onObservacao: (texto: string) => Promise<void>;
}) {
  const instrumento = acharInstrumento(aplicacao.instrumentId);
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(aplicacao.observacao ?? "");
  const data = (aplicacao.answeredAt ?? aplicacao.createdAt)?.toDate?.();
  const delta = variacao(historico, aplicacao);

  return (
    <div className="card">
      <div className="flex items-start gap-2">
        <span className="text-xl">{instrumento?.icone ?? "📝"}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-brand-800">{aplicacao.instrumentName}</p>
          <p className="text-[11px] text-brand-400">
            {data ? data.toLocaleDateString("pt-BR") : "agora"} ·{" "}
            {aplicacao.origem === "aplicado"
              ? "aplicado na sessão"
              : aplicacao.origem === "enviado"
                ? "enviado por link"
                : "registrado por você"}
          </p>
        </div>
        <button onClick={onApagar} className="shrink-0 text-xs font-bold text-brand-300">
          Apagar
        </button>
      </div>

      {aplicacao.status === "pendente" ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-cream-100 p-2.5">
          <span className="min-w-0 flex-1 text-xs leading-snug text-brand-500">
            Aguardando resposta. O link continua valendo até ser respondido.
          </span>
          <button
            onClick={onCopiarLink}
            className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-brand-600"
          >
            Copiar link
          </button>
        </div>
      ) : (
        <div className="mt-3">
          {aplicacao.risco && (
            <p className="mb-2 rounded-xl bg-rose-50 p-2.5 text-xs font-bold leading-snug text-rose-700">
              ⚠️ Respondeu acima de zero no item sobre pensamentos de morte ou de se ferir. Avaliar risco
              na próxima conversa.
            </p>
          )}

          {aplicacao.total !== undefined && instrumento && (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold text-brand-900">
                {escoreApresentado(instrumento, aplicacao.total).valor}
              </span>
              <span className="text-xs text-brand-400">
                de {escoreApresentado(instrumento, aplicacao.total).de}
              </span>
              {aplicacao.faixa && (
                <span className={clsx("rounded-full px-2 py-0.5 text-[11px] font-bold", tomClasse(aplicacao.tom))}>
                  {aplicacao.faixa}
                </span>
              )}
              {delta && (
                <span
                  className={clsx(
                    "text-[11px] font-bold",
                    delta.delta === 0 ? "text-brand-400" : delta.delta < 0 ? "text-emerald-600" : "text-amber-600"
                  )}
                >
                  {delta.delta > 0 ? "▲" : delta.delta < 0 ? "▼" : "="} {Math.abs(delta.delta)} vs.{" "}
                  {delta.anterior}
                </span>
              )}
            </div>
          )}

          {aplicacao.total !== undefined && instrumento?.faixas && (
            <p className="mt-1 text-xs leading-snug text-brand-500">
              {instrumento.faixas.find((f) => f.rotulo === aplicacao.faixa)?.descricao}
            </p>
          )}

          {aplicacao.fatores && (
            <div className="flex flex-col gap-2">
              {Object.entries(aplicacao.fatores).map(([id, valor]) => {
                const fator = instrumento?.fatores?.find((f) => f.id === id);
                const nome = fator?.nome ?? instrumento?.campos?.find((c) => c.id === id)?.nome ?? id;
                return (
                  <div key={id}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-bold text-brand-700">{nome}</span>
                      <span className="text-xs font-bold text-brand-400">{valor}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-cream-200">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${valor}%` }} />
                    </div>
                    {fator && (
                      <p className="mt-0.5 text-[11px] leading-snug text-brand-400">
                        {valor >= 50 ? fator.alto : fator.baixo}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {editando ? (
            <div className="mt-3 flex flex-col gap-2">
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={3}
                className="input-field resize-none"
                placeholder="O que esse resultado significou no caso dela."
              />
              <button
                onClick={async () => {
                  await onObservacao(texto);
                  setEditando(false);
                }}
                className="btn-secondary"
              >
                Salvar leitura
              </button>
            </div>
          ) : aplicacao.observacao ? (
            <button onClick={() => setEditando(true)} className="mt-3 w-full text-left">
              <p className="rounded-xl bg-cream-50 p-2.5 text-xs leading-relaxed text-brand-600">
                {aplicacao.observacao}
              </p>
            </button>
          ) : (
            <button onClick={() => setEditando(true)} className="mt-3 text-xs font-bold text-brand-400">
              + Anotar leitura clínica
            </button>
          )}
        </div>
      )}
    </div>
  );
}
