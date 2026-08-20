import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { BottomSheet } from "@/components/common/BottomSheet";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";
import { deleteSession, getAllSessions } from "@/services/sessions";
import { excluirPacientes, getLinkedPatientsBasics } from "@/services/patients";
import {
  acharCadastrosRepetidos,
  acharSessoesRepetidas,
  type GrupoDeNomes,
  type GrupoDeSessoes,
} from "@/utils/duplicidade";
import { PAYMENT_LABELS, STATUS_LABELS } from "@/utils/agenda";
import type { SessionDoc } from "@/types";

/**
 * Faxina da agenda: o que entrou duas vezes.
 *
 * A varredura não apaga nada sozinha. Duas sessões no mesmo horário podem ser
 * engano da importação — o caso comum — ou podem ser propositais, e só quem
 * marcou sabe. Então a tela mostra o que achou, sugere qual manter (a que já foi
 * trabalhada, não a cópia intocada) e espera a confirmação.
 */
export function DuplicatesSheet({ professionalId, onClose }: { professionalId: string; onClose: () => void }) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [gruposSessoes, setGruposSessoes] = useState<GrupoDeSessoes[]>([]);
  const [gruposNomes, setGruposNomes] = useState<GrupoDeNomes[]>([]);
  const [total, setTotal] = useState(0);
  /** Qual sessão fica, por grupo. Começa na sugestão e ela pode trocar. */
  const [manter, setManter] = useState<Record<string, string>>({});
  const [confirmando, setConfirmando] = useState<GrupoDeSessoes | "todos" | null>(null);
  const [limpando, setLimpando] = useState(false);
  const [progresso, setProgresso] = useState<{ feitos: number; total: number } | null>(null);
  const [limpos, setLimpos] = useState<Set<string>>(new Set());
  const [apagandoCadastro, setApagandoCadastro] = useState<{ id: string; nome: string } | null>(null);
  const [cadastrosApagados, setCadastrosApagados] = useState<Set<string>>(new Set());

  useEffect(() => {
    let vivo = true;
    Promise.all([getAllSessions(professionalId), getLinkedPatientsBasics(professionalId)])
      .then(([sessoes, pacientes]) => {
        if (!vivo) return;
        const grupos = acharSessoesRepetidas(sessoes);
        setTotal(sessoes.length);
        setGruposSessoes(grupos);
        setGruposNomes(acharCadastrosRepetidos(pacientes, sessoes));
        setManter(Object.fromEntries(grupos.map((g) => [g.chave, g.sugerida])));
      })
      .catch((e) => {
        if (!vivo) return;
        const codigo = (e as { code?: string })?.code ?? "";
        setErro(
          codigo === "permission-denied"
            ? "Faltam permissões para ler a agenda inteira. Publique as regras: firebase deploy --only firestore:rules"
            : `Não consegui varrer a agenda agora. [${codigo || "sem código"}]`
        );
      })
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [professionalId]);

  const pendentes = gruposSessoes.filter((g) => !limpos.has(g.chave));
  /** O que sai se ela mandar limpar tudo: uma fica em cada horário, o resto vai. */
  const sobrando = pendentes.reduce((n, g) => n + g.sessoes.length - 1, 0);
  // Um grupo de nomes some da lista quando sobra um cadastro só: deixou de ser repetido.
  const nomesPendentes = gruposNomes.filter(
    (g) => g.pacientes.filter((p) => !cadastrosApagados.has(p.id)).length > 1
  );
  const tudoLimpo = pendentes.length === 0 && nomesPendentes.length === 0;

  /**
   * Apaga as cópias, de um horário ou de todos.
   *
   * Vai uma a uma e marca o grupo como resolvido assim que ele termina: se cair
   * a internet no meio de trinta, o que já saiu está registrado na tela em vez
   * de a varredura inteira parecer não ter acontecido.
   */
  async function limpar(grupos: GrupoDeSessoes[]) {
    const alvos = grupos.flatMap((g) => g.sessoes.filter((s) => s.id !== manter[g.chave]));
    setLimpando(true);
    setProgresso({ feitos: 0, total: alvos.length });
    let feitos = 0;
    try {
      for (const g of grupos) {
        for (const s of g.sessoes) {
          if (s.id === manter[g.chave]) continue;
          await deleteSession(s.id);
          feitos++;
          setProgresso({ feitos, total: alvos.length });
        }
        setLimpos((prev) => new Set(prev).add(g.chave));
      }
      showToast(feitos === 1 ? "Cópia removida. A original ficou." : `${feitos} cópias removidas.`);
    } catch (e) {
      const codigo = (e as { code?: string })?.code ?? "";
      showToast(
        feitos > 0
          ? `Parei no meio: ${feitos} já saíram. Tente de novo para o resto. [${codigo || "sem código"}]`
          : `Não consegui remover. [${codigo || "sem código"}]`,
        "error"
      );
    } finally {
      setLimpando(false);
      setProgresso(null);
      setConfirmando(null);
    }
  }

  /** Apaga um cadastro repetido — só é oferecido para o que não tem atendimento nenhum. */
  async function apagarCadastro(id: string) {
    setLimpando(true);
    try {
      const r = await excluirPacientes([id]);
      setCadastrosApagados((prev) => new Set(prev).add(id));
      showToast(r.desvinculados > 0 ? "Cadastro desvinculado da sua lista." : "Cadastro repetido excluído.");
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setLimpando(false);
      setApagandoCadastro(null);
    }
  }

  return (
    <BottomSheet open onClose={onClose} title="Verificar duplicidade">
      <div className="flex flex-col gap-4">
        {carregando ? (
          <p className="py-6 text-center text-sm text-brand-400">Varrendo a agenda inteira...</p>
        ) : erro ? (
          <p className="rounded-xl bg-rose-50 p-3 text-xs leading-snug text-rose-700">{erro}</p>
        ) : (
          <>
            <p className="rounded-2xl bg-cream-100 p-3 text-xs leading-relaxed text-brand-600">
              Olhei {total} {total === 1 ? "atendimento" : "atendimentos"} — do primeiro ao último, sem
              recorte de data.{" "}
              {tudoLimpo ? (
                <span className="font-bold">Nada repetido.</span>
              ) : (
                <>
                  Nada é apagado sem você mandar: duas sessões no mesmo horário podem ser engano da
                  importação ou podem ser de propósito.
                </>
              )}
            </p>

            {tudoLimpo && (
              <div className="py-4 text-center">
                <p className="text-4xl">✅</p>
                <p className="mt-2 text-sm font-bold text-brand-700">
                  {limpos.size > 0 || cadastrosApagados.size > 0 ? "Tudo resolvido" : "Agenda limpa"}
                </p>
                <p className="mt-1 text-xs text-brand-400">
                  Nenhum paciente aparece duas vezes no mesmo horário, e nenhum nome está cadastrado em
                  dobro.
                </p>
              </div>
            )}

            {pendentes.length > 0 && (
              <section className="flex flex-col gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-400">
                  Atendimentos repetidos ({pendentes.length})
                </p>

                {/* Trinta horários repetidos, um a um, é trabalho que ninguém faz
                    até o fim. O de uma vez resolve a leva; a escolha individual
                    continua embaixo para quando ela quiser mandar em algum. */}
                <button
                  onClick={() => setConfirmando("todos")}
                  disabled={limpando}
                  className="rounded-xl bg-brand-500 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                >
                  {limpando && progresso
                    ? `Removendo ${progresso.feitos} de ${progresso.total}...`
                    : `Remover as ${sobrando} cópias de uma vez`}
                </button>
                <p className="-mt-1 text-[11px] leading-snug text-brand-400">
                  Fica um atendimento em cada horário — o que está marcado abaixo em cada grupo. Confira
                  antes se algum deles você quer manter diferente.
                </p>

                {pendentes.map((g) => (
                  <GrupoSessoes
                    key={g.chave}
                    grupo={g}
                    escolhida={manter[g.chave]}
                    onEscolher={(id) => setManter((prev) => ({ ...prev, [g.chave]: id }))}
                    onLimpar={() => setConfirmando(g)}
                  />
                ))}
              </section>
            )}

            {limpos.size > 0 && (
              <p className="rounded-xl bg-emerald-50 p-2.5 text-xs font-bold text-emerald-700">
                {limpos.size} {limpos.size === 1 ? "horário resolvido" : "horários resolvidos"} nesta
                passada.
              </p>
            )}

            {nomesPendentes.length > 0 && (
              <section className="flex flex-col gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-400">
                  Cadastros com o mesmo nome ({nomesPendentes.length})
                </p>
                <p className="text-[11px] leading-snug text-brand-400">
                  Xará existe, e apagar o cadastro errado leva junto rotina, prontuário e histórico. Por
                  isso aqui só dá para excluir o que <span className="font-bold">não tem atendimento
                  nenhum</span> — a cópia vazia da importação. Se os dois tiverem, abra cada um e decida.
                </p>
                {nomesPendentes.map((g) => {
                  const vivos = g.pacientes.filter((p) => !cadastrosApagados.has(p.id));
                  if (vivos.length < 2) return null;
                  const comAtendimento = vivos.filter((p) => p.sessoes > 0).length;
                  return (
                    <div key={g.nome} className="rounded-2xl bg-cream-50 p-3">
                      <p className="text-sm font-bold text-brand-800">{g.nome}</p>
                      <div className="mt-1.5 flex flex-col gap-1">
                        {vivos.map((p) => (
                          <div key={p.id} className="flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-2">
                            <button
                              onClick={() => {
                                onClose();
                                navigate(`/pacientes/${p.id}`);
                              }}
                              className="min-w-0 flex-1 text-left text-xs text-brand-600"
                            >
                              {p.sessoes === 0
                                ? "sem nenhum atendimento"
                                : `${p.sessoes} ${p.sessoes === 1 ? "atendimento" : "atendimentos"}`}
                              {!p.ativo && " · inativo"}
                              <span className="ml-1.5 font-bold text-brand-400">abrir ›</span>
                            </button>
                            {/* Só o vazio ganha botão, e só enquanto houver outro
                                para ficar no lugar dele. */}
                            {p.sessoes === 0 && comAtendimento > 0 && (
                              <button
                                onClick={() => setApagandoCadastro({ id: p.id, nome: p.name })}
                                disabled={limpando}
                                className="shrink-0 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-600"
                              >
                                Excluir
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </section>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmando}
        danger
        title={
          confirmando === "todos"
            ? `Remover ${sobrando} ${sobrando === 1 ? "cópia" : "cópias"}?`
            : confirmando && confirmando.sessoes.length > 2
              ? `Remover ${confirmando.sessoes.length - 1} cópias?`
              : "Remover a cópia?"
        }
        description={
          confirmando === "todos"
            ? `Sobra um atendimento em cada um dos ${pendentes.length} horários repetidos — o que está marcado em cada grupo. Os outros ${sobrando} saem da agenda. O registro clínico já escrito, se houver, continua guardado no prontuário.`
            : confirmando
              ? `Fica um atendimento de ${confirmando.patientName} em ${diaBR(confirmando.date)}. As outras saem da agenda — o registro clínico já escrito, se houver, continua guardado no prontuário.`
              : ""
        }
        confirmLabel={limpando ? "Removendo..." : "Remover"}
        onCancel={() => setConfirmando(null)}
        onConfirm={() =>
          confirmando && limpar(confirmando === "todos" ? pendentes : [confirmando])
        }
      />

      <ConfirmDialog
        open={!!apagandoCadastro}
        danger
        title="Excluir este cadastro repetido?"
        description={
          apagandoCadastro
            ? `“${apagandoCadastro.nome}” não tem nenhum atendimento marcado, mas leva junto o que estiver na rotina, nas anotações e no histórico dele. O outro cadastro com o mesmo nome continua intacto. Se a pessoa tiver conta própria, o cadastro não é apagado: ela só sai da sua lista.`
            : ""
        }
        confirmLabel={limpando ? "Excluindo..." : "Excluir"}
        onCancel={() => setApagandoCadastro(null)}
        onConfirm={() => apagandoCadastro && apagarCadastro(apagandoCadastro.id)}
      />
    </BottomSheet>
  );
}

function GrupoSessoes({
  grupo,
  escolhida,
  onEscolher,
  onLimpar,
}: {
  grupo: GrupoDeSessoes;
  escolhida: string;
  onEscolher: (id: string) => void;
  onLimpar: () => void;
}) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
      <p className="text-sm font-bold text-brand-800">{grupo.patientName}</p>
      <p className="text-[11px] font-bold text-amber-700">
        {diaBR(grupo.date)} · {grupo.sessoes.length} atendimentos no mesmo horário
      </p>

      <div className="mt-2 flex flex-col gap-1.5">
        {grupo.sessoes.map((s, i) => (
          <button
            key={s.id}
            onClick={() => onEscolher(s.id)}
            className={clsx(
              "flex items-start gap-2.5 rounded-xl px-2.5 py-2 text-left",
              escolhida === s.id ? "bg-brand-500 text-white" : "bg-white text-brand-700"
            )}
          >
            <span
              className={clsx(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                escolhida === s.id ? "border-white" : "border-brand-200"
              )}
            >
              {escolhida === s.id && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold">
                {s.startTime} às {s.endTime}
                {i === 0 && <span className="ml-1.5 font-normal opacity-70">· a primeira criada</span>}
              </span>
              <span className={clsx("block text-[11px]", escolhida === s.id ? "text-white/75" : "text-brand-400")}>
                {resumo(s)}
              </span>
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={onLimpar}
        className="mt-2 w-full rounded-xl bg-brand-500 px-3 py-2 text-xs font-bold text-white"
      >
        Manter a marcada e remover{" "}
        {grupo.sessoes.length > 2 ? `as outras ${grupo.sessoes.length - 1}` : "a outra"}
      </button>
    </div>
  );
}

/** O que essa sessão carrega além do horário — é o que se perde ao apagá-la. */
function resumo(s: SessionDoc): string {
  const partes = [STATUS_LABELS[s.status], PAYMENT_LABELS[s.paymentStatus]];
  if (s.price != null) partes.push(s.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
  if (s.note?.trim()) partes.push("com observação");
  return partes.join(" · ");
}

function diaBR(date: string): string {
  return date.split("-").reverse().join("/");
}
