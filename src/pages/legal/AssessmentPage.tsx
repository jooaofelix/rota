import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import clsx from "clsx";
import { getAssessment, responderAplicacao } from "@/services/assessments";
import { acharInstrumento } from "@/data/instruments";
import type { AssessmentDoc } from "@/types";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { pontuar } from "@/utils/assessments";
import { firstName } from "@/utils/proposals";

/**
 * Página onde o teste é respondido — sem login.
 *
 * A mesma tela serve para os três jeitos de aplicar: ela passa o celular na
 * sessão, abre no computador do consultório, ou manda o link para a pessoa
 * responder em casa. O código no endereço é a credencial, como na proposta.
 */
export function AssessmentPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const [aplicacao, setAplicacao] = useState<AssessmentDoc | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [respostas, setRespostas] = useState<Record<number, number>>({});
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Respondido, a leitura pública fecha — o link deixa de abrir o documento. Só
  // um link inexistente volta vazio; o que dá erro é o que já foi usado.
  const [jaUsado, setJaUsado] = useState(false);
  const refsItens = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    getAssessment(token)
      .then(setAplicacao)
      .catch(() => setJaUsado(true))
      .finally(() => setCarregando(false));
  }, [token]);

  const instrumento = aplicacao ? acharInstrumento(aplicacao.instrumentId) : undefined;
  const itens = instrumento?.itens ?? [];
  const respondidas = Object.keys(respostas).length;
  const completo = itens.length > 0 && respondidas === itens.length;

  const resultado = useMemo(
    () =>
      instrumento && completo
        ? pontuar(instrumento, itens.map((_, i) => respostas[i]))
        : null,
    [instrumento, completo, itens, respostas]
  );

  function responder(indice: number, valor: number) {
    setRespostas((prev) => ({ ...prev, [indice]: valor }));
    // Leva para a próxima ainda não respondida: numa lista de vinte frases no
    // celular, procurar onde parou é o que faz a pessoa desistir no meio.
    const proxima = itens.findIndex((_, i) => i !== indice && respostas[i] === undefined && i > indice);
    if (proxima >= 0) {
      window.setTimeout(
        () => refsItens.current[proxima]?.scrollIntoView({ behavior: "smooth", block: "center" }),
        120
      );
    }
  }

  async function enviar() {
    if (!instrumento || !completo) return;
    setEnviando(true);
    setErro(null);
    try {
      await responderAplicacao(token, instrumento, itens.map((_, i) => respostas[i]));
      setEnviado(true);
    } catch {
      setErro("Não consegui enviar. Confira a internet e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) return <LoadingSpinner brand />;

  if (jaUsado) {
    return (
      <Moldura>
        <p className="text-center text-4xl">✅</p>
        <p className="mt-3 text-center text-lg font-extrabold text-brand-900">Este teste já foi respondido</p>
        <p className="mt-2 text-center text-sm leading-relaxed text-brand-500">
          As respostas foram enviadas e o link se fechou. Se precisar responder de novo, peça um novo
          link.
        </p>
      </Moldura>
    );
  }

  if (!aplicacao || !instrumento || !instrumento.itens) {
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
    const risco = resultado?.risco ?? false;
    // Perfil de personalidade a própria pessoa pode ver — é conversa, não
    // diagnóstico. Escala de sintoma, não: "grave" numa tela, sozinho em casa,
    // sem ninguém para dizer o que aquilo significa, faz mal e não ajuda.
    const mostrarPerfil = !!instrumento.fatores && !!resultado?.fatores;
    return (
      <Moldura>
        <p className="text-center text-4xl">✅</p>
        <p className="mt-3 text-center text-lg font-extrabold text-brand-900">Respostas enviadas</p>
        <p className="mt-2 text-center text-sm leading-relaxed text-brand-500">
          Obrigado por responder, {firstName(aplicacao.patientName)}.{" "}
          {aplicacao.professionalName} recebeu e vai conversar com você sobre isso.
        </p>

        {mostrarPerfil && (
          <div className="mt-5 flex flex-col gap-2.5">
            {instrumento.fatores!.map((f) => (
              <div key={f.id}>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold text-brand-700">{f.nome}</span>
                  <span className="text-xs font-bold text-brand-400">{resultado!.fatores![f.id]}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-cream-200">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${resultado!.fatores![f.id]}%` }} />
                </div>
              </div>
            ))}
            <p className="mt-1 text-[11px] leading-snug text-brand-400">
              Não existe fator bom ou ruim: é o retrato de um jeito de ser, para conversar em sessão.
            </p>
          </div>
        )}

        {risco && (
          <div className="mt-5 rounded-2xl bg-rose-50 p-4">
            <p className="text-sm font-bold text-rose-800">Você não precisa passar por isso sozinho(a)</p>
            <p className="mt-1 text-xs leading-relaxed text-rose-700">
              Uma das suas respostas fala de pensamentos de se ferir. Se isso apertar antes da próxima
              sessão, procure ajuda na hora: o <strong>CVV atende 24 horas no 188</strong>, por telefone e
              de graça. Em emergência, ligue <strong>192</strong> ou vá ao pronto-socorro mais próximo.
            </p>
          </div>
        )}

        {window.history.length > 1 && (
          <button onClick={() => navigate(-1)} className="mt-5 w-full text-center text-sm font-bold text-brand-400">
            Voltar
          </button>
        )}
      </Moldura>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="sticky top-0 z-10 border-b border-cream-200 bg-cream-50/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-md">
          <p className="text-sm font-extrabold text-brand-900">{instrumento.nome}</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream-200">
              <div
                className="h-full rounded-full bg-brand-500 transition-all"
                style={{ width: `${(respondidas / itens.length) * 100}%` }}
              />
            </div>
            <span className="shrink-0 text-[11px] font-bold text-brand-400">
              {respondidas}/{itens.length}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-4">
        <p className="rounded-2xl bg-white p-4 text-sm leading-relaxed text-brand-600 shadow-card">
          {instrumento.enunciado}
        </p>

        <div className="mt-3 flex flex-col gap-3">
          {itens.map((item, i) => (
            <div
              key={i}
              ref={(el) => {
                refsItens.current[i] = el;
              }}
              className="rounded-2xl bg-white p-4 shadow-card"
            >
              <p className="text-sm font-bold leading-snug text-brand-800">
                <span className="text-brand-300">{i + 1}.</span> {item.texto}
              </p>
              <div className="mt-3 flex flex-col gap-1.5">
                {instrumento.escala!.map((opcao) => {
                  const marcada = respostas[i] === opcao.valor;
                  return (
                    <button
                      key={opcao.valor}
                      onClick={() => responder(i, opcao.valor)}
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
                      {opcao.rotulo}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {erro && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{erro}</p>}

        <p className="mt-4 text-center text-[11px] leading-snug text-brand-300">
          Suas respostas vão apenas para {aplicacao.professionalName}.
        </p>
      </div>

      <div className="safe-bottom sticky bottom-0 border-t border-cream-200 bg-white px-4 py-3">
        <div className="mx-auto max-w-md">
          <button onClick={enviar} disabled={!completo || enviando} className="btn-primary">
            {enviando
              ? "Enviando..."
              : completo
                ? "Enviar respostas"
                : `Faltam ${itens.length - respondidas} ${itens.length - respondidas === 1 ? "resposta" : "respostas"}`}
          </button>
        </div>
      </div>
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
