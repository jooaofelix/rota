import { useEffect, useState } from "react";
import clsx from "clsx";
import { BottomSheet } from "@/components/common/BottomSheet";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";
import { QUESTIONARIOS, acharQuestionario, type Questionario } from "@/data/schemaQuestionnaires";
import { criarAplicacao, removerAplicacao, salvarObservacao, subscribeToAssessments } from "@/services/assessments";
import type { AssessmentDoc } from "@/types";
import { ativados, largura, linkDoQuestionario, novoToken, porIntensidade } from "@/utils/schemaScoring";
import { firstName } from "@/utils/proposals";

/**
 * Questionários aplicados a um paciente.
 *
 * O resultado mora aqui e só aqui: quem responde vê "obrigado", quem lê é ela.
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
  const [escolhendo, setEscolhendo] = useState(false);
  const [apagando, setApagando] = useState<AssessmentDoc | null>(null);
  const [criando, setCriando] = useState(false);

  useEffect(
    () => subscribeToAssessments(professionalId, patientId, setItens),
    [professionalId, patientId]
  );

  async function aplicar(questionario: Questionario, modo: "link" | "aqui") {
    setCriando(true);
    try {
      const token = novoToken();
      await criarAplicacao(token, {
        professionalId,
        professionalName,
        patientId,
        patientName,
        questionario,
      });
      const endereco = linkDoQuestionario(token);
      if (modo === "aqui") {
        window.open(endereco, "_blank");
        showToast("Aberto em outra aba. Entregue o aparelho.");
      } else {
        const texto = `Oi, ${firstName(patientName)}! Preparei um questionário para a gente trabalhar na terapia (${questionario.minutos} min, dá para parar e voltar depois): ${endereco}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
        showToast("Link criado. Fica pendente até a pessoa responder.");
      }
      setEscolhendo(false);
    } catch {
      showToast("Não consegui criar o questionário. Tente de novo.", "error");
    } finally {
      setCriando(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button onClick={() => setEscolhendo(true)} className="btn-primary">
        + Aplicar questionário
      </button>

      {itens.length === 0 ? (
        <EmptyState
          icon="🧩"
          title="Nenhum questionário aplicado"
          description="Mande o link para responder em casa ou aplique aqui na sessão. O resultado aparece só para você."
        />
      ) : (
        itens.map((a) => (
          <Cartao
            key={a.id}
            aplicacao={a}
            onCopiar={async () => {
              await navigator.clipboard.writeText(linkDoQuestionario(a.id));
              showToast("Link copiado.");
            }}
            onApagar={() => setApagando(a)}
            onObservacao={(t) => salvarObservacao(a.id, t)}
          />
        ))
      )}

      <BottomSheet open={escolhendo} onClose={() => setEscolhendo(false)} title="Aplicar questionário">
        <div className="flex flex-col gap-2">
          {QUESTIONARIOS.map((q) => (
            <div key={q.id} className="rounded-2xl bg-cream-50 p-3">
              <div className="flex items-start gap-2.5">
                <span className="text-2xl">{q.icone}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-baseline gap-1.5">
                    <span className="truncate text-sm font-bold text-brand-800">{q.nome}</span>
                    <span className="shrink-0 text-[11px] font-bold text-brand-300">{q.sigla}</span>
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-brand-500">{q.resumo}</p>
                  <p className="mt-0.5 text-[11px] font-bold text-brand-400">
                    {q.itens.length} itens · ~{q.minutos} min
                  </p>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => aplicar(q, "link")}
                  disabled={criando}
                  className="flex-1 rounded-xl bg-brand-500 px-3 py-2 text-xs font-bold text-white"
                >
                  Enviar link
                </button>
                <button
                  onClick={() => aplicar(q, "aqui")}
                  disabled={criando}
                  className="flex-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-brand-600"
                >
                  Aplicar aqui
                </button>
              </div>
            </div>
          ))}
          <p className="mt-1 text-[11px] leading-snug text-brand-400">
            Itens, faixas e contas vieram da sua planilha, sem alteração — cada fator soma exatamente os
            mesmos itens, e o corte de "ativado" no YSQ continua sendo média ≥ 4.
          </p>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={!!apagando}
        danger
        title="Apagar esta aplicação?"
        description="O resultado sai do histórico e não volta. Se ainda estiver pendente, o link deixa de funcionar."
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
  onCopiar,
  onApagar,
  onObservacao,
}: {
  aplicacao: AssessmentDoc;
  onCopiar: () => void;
  onApagar: () => void;
  onObservacao: (texto: string) => Promise<void>;
}) {
  const q = acharQuestionario(aplicacao.questionarioId);
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(aplicacao.observacao ?? "");
  const [tudo, setTudo] = useState(false);
  const data = (aplicacao.answeredAt ?? aplicacao.createdAt)?.toDate?.();

  const marcados = q ? ativados(q, aplicacao.fatores) : [];
  const ordenados = q ? porIntensidade(q, aplicacao.fatores) : [];

  return (
    <div className="card">
      <div className="flex items-start gap-2">
        <span className="text-xl">{q?.icone ?? "🧩"}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-brand-800">{aplicacao.questionarioNome}</p>
          <p className="text-[11px] text-brand-400">{data ? data.toLocaleDateString("pt-BR") : "agora"}</p>
        </div>
        <button onClick={onApagar} className="shrink-0 text-xs font-bold text-brand-300">
          Apagar
        </button>
      </div>

      {aplicacao.status === "pendente" ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-cream-100 p-2.5">
          <span className="min-w-0 flex-1 text-xs leading-snug text-brand-500">
            Aguardando resposta. O link vale até ser respondido.
          </span>
          <button onClick={onCopiar} className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-brand-600">
            Copiar link
          </button>
        </div>
      ) : (
        <div className="mt-3">
          {aplicacao.media !== undefined && (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-brand-900">
                {aplicacao.media.toFixed(2).replace(".", ",")}
              </span>
              <span className="text-xs text-brand-400">média geral (1 a 6)</span>
            </div>
          )}

          {q && q.corte !== undefined && aplicacao.fatores && (
            <div className="mb-3">
              <p className="text-xs font-bold text-brand-700">
                {marcados.length === 0
                  ? "Nenhum esquema atingiu o corte (média ≥ 4)"
                  : `${marcados.length} ${marcados.length === 1 ? "esquema ativado" : "esquemas ativados"} (média ≥ 4)`}
              </p>
              {marcados.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {marcados.map((f) => (
                    <span key={f.id} className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                      {f.nome} {f.valor.toFixed(1).replace(".", ",")}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {q && aplicacao.fatores && (
            <>
              {q.dominios && tudo ? (
                q.dominios.map((d) => (
                  <div key={d.nome} className="mb-3">
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-brand-400">{d.nome}</p>
                    {d.fatores.map((fid) => {
                      const f = q.fatores.find((x) => x.id === fid);
                      if (!f) return null;
                      return (
                        <Barra
                          key={fid}
                          nome={f.nome}
                          valor={aplicacao.fatores![fid] ?? 0}
                          valorPai={aplicacao.fatoresPai?.[fid]}
                          colunas={q.colunas}
                          acima={q.corte !== undefined && (aplicacao.fatores![fid] ?? 0) >= q.corte}
                        />
                      );
                    })}
                  </div>
                ))
              ) : (
                (tudo ? ordenados : ordenados.slice(0, 5)).map((f) => (
                  <Barra
                    key={f.id}
                    nome={f.nome}
                    valor={f.valor}
                    valorPai={aplicacao.fatoresPai?.[f.id]}
                    colunas={q.colunas}
                    acima={q.corte !== undefined && f.valor >= q.corte}
                  />
                ))
              )}

              <button onClick={() => setTudo((v) => !v)} className="mt-1 text-xs font-bold text-brand-500">
                {tudo
                  ? "Mostrar só os mais altos"
                  : q.dominios
                    ? "Ver todos, por domínio"
                    : `Ver todos os ${q.fatores.length}`}
              </button>
            </>
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

function Barra({
  nome,
  valor,
  valorPai,
  colunas,
  acima,
}: {
  nome: string;
  valor: number;
  valorPai?: number;
  colunas?: string[];
  acima: boolean;
}) {
  return (
    <div className="mb-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className={clsx("truncate text-xs font-bold", acima ? "text-rose-700" : "text-brand-700")}>{nome}</span>
        <span className="shrink-0 text-xs font-bold text-brand-400">
          {valor.toFixed(1).replace(".", ",")}
          {valorPai !== undefined && ` · ${valorPai.toFixed(1).replace(".", ",")}`}
        </span>
      </div>
      <Trilho valor={valor} acima={acima} rotulo={colunas?.[0]} />
      {valorPai !== undefined && <Trilho valor={valorPai} acima={acima} rotulo={colunas?.[1]} />}
    </div>
  );
}

function Trilho({ valor, acima, rotulo }: { valor: number; acima: boolean; rotulo?: string }) {
  return (
    <div className="mt-1 flex items-center gap-1.5">
      {rotulo && <span className="w-7 shrink-0 text-[10px] font-bold text-brand-300">{rotulo}</span>}
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream-200">
        <div
          className={clsx("h-full rounded-full", acima ? "bg-rose-400" : "bg-brand-500")}
          style={{ width: `${largura(valor)}%` }}
        />
      </div>
    </div>
  );
}
