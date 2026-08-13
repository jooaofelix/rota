import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import clsx from "clsx";
import { getAssessment, responder } from "@/services/assessments";
import { acharQuestionario } from "@/data/schemaQuestionnaires";
import type { AssessmentDoc } from "@/types";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { rascunhoKey } from "@/utils/schemaScoring";
import { firstName } from "@/utils/proposals";

/** Itens por página. Rolagem infinita de 186 frases desanima antes da metade. */
const POR_PAGINA = 10;

/**
 * Onde o questionário é respondido — sem login.
 *
 * A mesma tela serve para os dois jeitos de aplicar: ela manda o link e a
 * pessoa responde em casa, ou abre aqui na sessão e passa o aparelho. O código
 * no endereço é a credencial, como na proposta.
 *
 * Nada de resultado aparece aqui. Esquema ativado não é informação que se lê
 * sozinho no ônibus — é conversa de sessão, e a leitura vai para ela.
 */
export function QuestionnairePage() {
  const { token = "" } = useParams();
  const [aplicacao, setAplicacao] = useState<AssessmentDoc | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [jaUsado, setJaUsado] = useState(false);
  const [respostas, setRespostas] = useState<Record<number, number>>({});
  const [respostasPai, setRespostasPai] = useState<Record<number, number>>({});
  const [pagina, setPagina] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const topo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAssessment(token)
      .then(setAplicacao)
      .catch(() => setJaUsado(true))
      .finally(() => setCarregando(false));
  }, [token]);

  // Rascunho: quem começa 186 itens no ônibus termina em casa, e fechar a aba
  // no meio não pode custar meia hora de trabalho.
  useEffect(() => {
    const bruto = localStorage.getItem(rascunhoKey(token));
    if (!bruto) return;
    try {
      const d = JSON.parse(bruto);
      setRespostas(d.respostas ?? {});
      setRespostasPai(d.respostasPai ?? {});
      setPagina(d.pagina ?? 0);
    } catch {
      // Rascunho corrompido não impede começar de novo.
    }
  }, [token]);

  const questionario = aplicacao ? acharQuestionario(aplicacao.questionarioId) : undefined;
  const duasColunas = !!questionario?.colunas;
  const totalItens = questionario?.itens.length ?? 0;

  const respondidas = useMemo(() => {
    if (!questionario) return 0;
    return questionario.itens.filter(
      (_, i) => respostas[i] !== undefined && (!duasColunas || respostasPai[i] !== undefined)
    ).length;
  }, [questionario, respostas, respostasPai, duasColunas]);

  const completo = totalItens > 0 && respondidas === totalItens;
  const paginas = Math.ceil(totalItens / POR_PAGINA);
  const inicio = pagina * POR_PAGINA;
  const daPagina = questionario?.itens.slice(inicio, inicio + POR_PAGINA) ?? [];
  const paginaCompleta = daPagina.every(
    (_, k) => respostas[inicio + k] !== undefined && (!duasColunas || respostasPai[inicio + k] !== undefined)
  );

  function guardar(novas: Record<number, number>, novasPai: Record<number, number>, novaPagina: number) {
    localStorage.setItem(
      rascunhoKey(token),
      JSON.stringify({ respostas: novas, respostasPai: novasPai, pagina: novaPagina })
    );
  }

  function marcar(indice: number, valor: number, coluna: 0 | 1) {
    if (coluna === 0) {
      const novas = { ...respostas, [indice]: valor };
      setRespostas(novas);
      guardar(novas, respostasPai, pagina);
    } else {
      const novas = { ...respostasPai, [indice]: valor };
      setRespostasPai(novas);
      guardar(respostas, novas, pagina);
    }
  }

  function irPara(n: number) {
    setPagina(n);
    guardar(respostas, respostasPai, n);
    topo.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function enviar() {
    if (!questionario || !completo) return;
    setEnviando(true);
    setErro(null);
    try {
      const lista = questionario.itens.map((_, i) => respostas[i]);
      const listaPai = duasColunas ? questionario.itens.map((_, i) => respostasPai[i]) : undefined;
      await responder(token, questionario, lista, listaPai);
      localStorage.removeItem(rascunhoKey(token));
      setEnviado(true);
    } catch {
      setErro("Não consegui enviar. Confira a internet e tente de novo — suas respostas continuam guardadas aqui.");
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) return <LoadingSpinner brand />;

  if (jaUsado) {
    return (
      <Moldura>
        <p className="text-center text-4xl">✅</p>
        <p className="mt-3 text-center text-lg font-extrabold text-brand-900">Este questionário já foi respondido</p>
        <p className="mt-2 text-center text-sm leading-relaxed text-brand-500">
          As respostas foram enviadas e o link se fechou. Se precisar responder de novo, peça um link novo.
        </p>
      </Moldura>
    );
  }

  if (!aplicacao || !questionario) {
    return (
      <Moldura>
        <p className="text-lg font-extrabold text-brand-900">Link não encontrado</p>
        <p className="mt-2 text-sm leading-relaxed text-brand-500">
          O endereço pode estar incompleto. Peça para reenviarem.
        </p>
      </Moldura>
    );
  }

  if (enviado || aplicacao.status === "respondido") {
    return (
      <Moldura>
        <p className="text-center text-4xl">✅</p>
        <p className="mt-3 text-center text-lg font-extrabold text-brand-900">Respostas enviadas</p>
        <p className="mt-2 text-center text-sm leading-relaxed text-brand-500">
          Obrigado por responder, {firstName(aplicacao.patientName)}. {aplicacao.professionalName} recebeu o
          resultado e vai conversar com você sobre ele na sessão.
        </p>
      </Moldura>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <div ref={topo} className="sticky top-0 z-10 border-b border-cream-200 bg-cream-50/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-md">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-sm font-extrabold text-brand-900">{questionario.nome}</p>
            <span className="shrink-0 text-[11px] font-bold text-brand-400">
              {respondidas}/{totalItens}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream-200">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${(respondidas / totalItens) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-4">
        {pagina === 0 && (
          <p className="mb-3 rounded-2xl bg-white p-4 text-sm leading-relaxed text-brand-600 shadow-card">
            {questionario.enunciado}
          </p>
        )}

        <div className="flex flex-col gap-3">
          {daPagina.map((texto, k) => {
            const i = inicio + k;
            return (
              <div key={i} className="rounded-2xl bg-white p-4 shadow-card">
                <p className="text-sm font-bold leading-snug text-brand-800">
                  <span className="text-brand-300">{i + 1}.</span> {texto}
                </p>
                {duasColunas ? (
                  questionario.colunas!.map((coluna, c) => (
                    <div key={coluna} className="mt-3">
                      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-400">
                        {coluna}
                      </p>
                      <Chips
                        escala={questionario.escala}
                        valor={(c === 0 ? respostas : respostasPai)[i]}
                        onEscolher={(v) => marcar(i, v, c as 0 | 1)}
                        compacto
                      />
                    </div>
                  ))
                ) : (
                  <div className="mt-3">
                    <Chips
                      escala={questionario.escala}
                      valor={respostas[i]}
                      onEscolher={(v) => marcar(i, v, 0)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {erro && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{erro}</p>}

        <p className="mt-4 text-center text-[11px] leading-snug text-brand-300">
          Suas respostas vão apenas para {aplicacao.professionalName}. Você pode parar e voltar depois — o
          que já respondeu fica guardado neste aparelho.
        </p>
      </div>

      <div className="safe-bottom sticky bottom-0 border-t border-cream-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-md items-center gap-2">
          {pagina > 0 && (
            <button
              onClick={() => irPara(pagina - 1)}
              className="shrink-0 rounded-2xl bg-cream-100 px-4 py-3.5 text-sm font-bold text-brand-600"
            >
              Voltar
            </button>
          )}
          {pagina < paginas - 1 ? (
            <button onClick={() => irPara(pagina + 1)} disabled={!paginaCompleta} className="btn-primary">
              {paginaCompleta ? "Continuar" : "Responda todas desta página"}
            </button>
          ) : (
            <button onClick={enviar} disabled={!completo || enviando} className="btn-primary">
              {enviando ? "Enviando..." : completo ? "Enviar respostas" : `Faltam ${totalItens - respondidas}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Chips({
  escala,
  valor,
  onEscolher,
  compacto,
}: {
  escala: Array<{ valor: number; rotulo: string }>;
  valor: number | undefined;
  onEscolher: (v: number) => void;
  compacto?: boolean;
}) {
  // Compacto vira grade de números: com duas colunas por item, seis frases
  // inteiras duas vezes deixariam cada questão do tamanho da tela.
  if (compacto) {
    return (
      <div className="flex gap-1.5">
        {escala.map((o) => (
          <button
            key={o.valor}
            onClick={() => onEscolher(o.valor)}
            title={o.rotulo}
            className={clsx(
              "h-10 flex-1 rounded-xl text-sm font-bold transition",
              valor === o.valor ? "bg-brand-500 text-white" : "bg-cream-100 text-brand-600"
            )}
          >
            {o.valor}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {escala.map((o) => {
        const marcada = valor === o.valor;
        return (
          <button
            key={o.valor}
            onClick={() => onEscolher(o.valor)}
            className={clsx(
              "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition",
              marcada ? "bg-brand-500 text-white" : "bg-cream-100 text-brand-600"
            )}
          >
            <span
              className={clsx(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                marcada ? "border-white" : "border-brand-200"
              )}
            >
              {marcada && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
            </span>
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-50 p-5">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-card">{children}</div>
    </div>
  );
}
