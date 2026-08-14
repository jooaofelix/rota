import { useEffect, useState } from "react";
import clsx from "clsx";
import { BottomSheet } from "@/components/common/BottomSheet";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";
import { atualizarMeta, criarMeta, removerMeta, subscribeToGoals } from "@/services/goals";
import type { GoalDoc } from "@/types";
import { todayKey } from "@/utils/date";

/**
 * Metas e avisos de futuro.
 *
 * Existe porque a agenda dela só sabe de paciente. O que ela quer para si —
 * terminar a formação, escrever o artigo, não marcar nada em julho por causa do
 * congresso — não tinha lugar nenhum no sistema e vivia num papelzinho.
 *
 * O aviso de agenda não fica só aqui: ao marcar um atendimento dentro do
 * período, a folha de agendamento lembra antes de gravar. Sem isso, "não marcar
 * em julho" seria só mais uma anotação que ninguém lê em julho.
 */
export function GoalsCard({ professionalId }: { professionalId: string }) {
  const { showToast } = useToast();
  const [metas, setMetas] = useState<GoalDoc[]>([]);
  const [editando, setEditando] = useState<GoalDoc | "nova" | null>(null);
  const [apagando, setApagando] = useState<GoalDoc | null>(null);
  const [verConcluidas, setVerConcluidas] = useState(false);

  useEffect(() => subscribeToGoals(professionalId, setMetas), [professionalId]);

  const abertas = metas.filter((m) => !m.concluida);
  const concluidas = metas.filter((m) => m.concluida);
  const visiveis = verConcluidas ? metas : abertas;

  return (
    <div className="card">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-sm font-bold text-brand-700">🎯 Minhas metas e avisos</p>
        <button onClick={() => setEditando("nova")} className="text-xs font-bold text-brand-500">
          + Nova
        </button>
      </div>

      {abertas.length === 0 && !verConcluidas ? (
        <p className="rounded-xl bg-cream-50 p-3 text-xs leading-relaxed text-brand-500">
          O que você quer para você. Formação, leitura, meta de faturamento — e também aviso de agenda:
          "não marcar em julho, congresso". No período do aviso, o sistema lembra na hora de agendar.
        </p>
      ) : (
        <div className="flex flex-col">
          {visiveis.map((m) => (
            <Linha
              key={m.id}
              meta={m}
              onAbrir={() => setEditando(m)}
              onAlternar={() => atualizarMeta(m.id, { concluida: !m.concluida })}
            />
          ))}
        </div>
      )}

      {concluidas.length > 0 && (
        <button
          onClick={() => setVerConcluidas((v) => !v)}
          className="mt-2 text-[11px] font-bold text-brand-400"
        >
          {verConcluidas ? "Esconder concluídas" : `Ver ${concluidas.length} concluída(s)`}
        </button>
      )}

      {editando && (
        <MetaSheet
          professionalId={professionalId}
          meta={editando === "nova" ? null : editando}
          onApagar={editando === "nova" ? undefined : () => setApagando(editando as GoalDoc)}
          onClose={() => setEditando(null)}
        />
      )}

      <ConfirmDialog
        open={!!apagando}
        danger
        title="Apagar esta anotação?"
        description="Some da lista e não volta."
        confirmLabel="Apagar"
        onCancel={() => setApagando(null)}
        onConfirm={async () => {
          if (apagando) await removerMeta(apagando.id);
          setApagando(null);
          setEditando(null);
          showToast("Apagado.");
        }}
      />
    </div>
  );
}

function formatarDia(iso?: string) {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a.slice(2)}`;
}

/** "faltam 12 dias", "este mês", "venceu" — o que ela precisa saber de relance. */
function quando(meta: GoalDoc): { texto: string; urgente: boolean } {
  const hoje = todayKey();
  const alvo = meta.tipo === "agenda" ? meta.inicio : meta.inicio;
  if (!alvo) return { texto: "sem prazo", urgente: false };

  if (meta.tipo === "agenda" && meta.fim && meta.inicio! <= hoje && hoje <= meta.fim) {
    return { texto: "acontecendo agora", urgente: true };
  }

  const dias = Math.round((new Date(alvo).getTime() - new Date(hoje).getTime()) / 86400000);
  if (dias < 0) return { texto: meta.tipo === "agenda" ? "já passou" : "prazo vencido", urgente: true };
  if (dias === 0) return { texto: "é hoje", urgente: true };
  if (dias <= 30) return { texto: `em ${dias} dia${dias === 1 ? "" : "s"}`, urgente: dias <= 7 };
  const meses = Math.round(dias / 30);
  return { texto: `em ${meses} ${meses === 1 ? "mês" : "meses"}`, urgente: false };
}

function Linha({
  meta,
  onAbrir,
  onAlternar,
}: {
  meta: GoalDoc;
  onAbrir: () => void;
  onAlternar: () => void;
}) {
  const q = quando(meta);
  const pct = meta.alvo ? Math.min(100, Math.round(((meta.progresso ?? 0) / meta.alvo) * 100)) : null;

  return (
    <div className="flex items-start gap-2.5 border-b border-brand-50 py-2 last:border-b-0">
      <button
        onClick={onAlternar}
        className={clsx(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-[11px] font-bold",
          meta.concluida ? "border-brand-500 bg-brand-500 text-white" : "border-brand-200"
        )}
      >
        {meta.concluida ? "✓" : ""}
      </button>

      <button onClick={onAbrir} className="min-w-0 flex-1 text-left">
        <p className="flex items-center gap-1.5">
          <span className="shrink-0 text-sm">{meta.tipo === "agenda" ? "🚫" : "🎯"}</span>
          <span
            className={clsx(
              "truncate text-sm font-bold",
              meta.concluida ? "text-brand-300 line-through" : "text-brand-800"
            )}
          >
            {meta.titulo}
          </span>
        </p>

        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className={clsx("font-bold", q.urgente ? "text-rose-600" : "text-brand-400")}>{q.texto}</span>
          {meta.tipo === "agenda" && meta.inicio && (
            <span className="text-brand-300">
              · {formatarDia(meta.inicio)}
              {meta.fim && meta.fim !== meta.inicio ? ` a ${formatarDia(meta.fim)}` : ""}
            </span>
          )}
          {pct !== null && (
            <span className="text-brand-400">
              · {meta.progresso ?? 0}/{meta.alvo} {meta.unidade ?? ""}
            </span>
          )}
        </p>

        {pct !== null && (
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cream-200">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
          </div>
        )}
      </button>
    </div>
  );
}

function MetaSheet({
  professionalId,
  meta,
  onApagar,
  onClose,
}: {
  professionalId: string;
  meta: GoalDoc | null;
  onApagar?: () => void;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [tipo, setTipo] = useState<GoalDoc["tipo"]>(meta?.tipo ?? "meta");
  const [titulo, setTitulo] = useState(meta?.titulo ?? "");
  const [detalhe, setDetalhe] = useState(meta?.detalhe ?? "");
  const [inicio, setInicio] = useState(meta?.inicio ?? "");
  const [fim, setFim] = useState(meta?.fim ?? "");
  const [alvo, setAlvo] = useState(meta?.alvo ? String(meta.alvo) : "");
  const [progresso, setProgresso] = useState(meta?.progresso ? String(meta.progresso) : "");
  const [unidade, setUnidade] = useState(meta?.unidade ?? "");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!titulo.trim()) return;
    setSalvando(true);
    try {
      const dados = {
        tipo,
        titulo,
        detalhe,
        inicio: inicio || undefined,
        fim: tipo === "agenda" ? fim || inicio || undefined : undefined,
        alvo: alvo ? Number(alvo) : undefined,
        progresso: progresso ? Number(progresso) : 0,
        unidade,
      };
      if (meta) await atualizarMeta(meta.id, dados);
      else await criarMeta(professionalId, dados);
      showToast(meta ? "Atualizado." : "Anotado.");
      onClose();
    } catch {
      showToast("Não consegui salvar. Tente de novo.", "error");
      setSalvando(false);
    }
  }

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={meta ? "Editar" : "Nova meta ou aviso"}
      footer={
        <div className="flex flex-col gap-2">
          <button onClick={salvar} disabled={!titulo.trim() || salvando} className="btn-primary">
            {salvando ? "Salvando..." : "Salvar"}
          </button>
          {onApagar && (
            <button onClick={onApagar} className="text-sm font-bold text-rose-400">
              Apagar
            </button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Escolha ativo={tipo === "meta"} onClick={() => setTipo("meta")}>
            🎯 Meta
          </Escolha>
          <Escolha ativo={tipo === "agenda"} onClick={() => setTipo("agenda")}>
            🚫 Aviso de agenda
          </Escolha>
        </div>

        <p className="rounded-xl bg-cream-50 p-2.5 text-[11px] leading-snug text-brand-500">
          {tipo === "meta"
            ? "Algo que você quer alcançar: terminar a formação, escrever o artigo, atingir um faturamento."
            : "Um período em que você não quer atendimento. Ao marcar sessão dentro dele, o ROTA te lembra antes de gravar."}
        </p>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-brand-700">
            {tipo === "meta" ? "O que você quer alcançar" : "Do que se trata"}
          </span>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder={
              tipo === "meta" ? "Concluir a especialização em TCC" : "Congresso — não marcar atendimentos"
            }
            className="input-field"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-brand-700">Detalhe (opcional)</span>
          <textarea
            value={detalhe}
            onChange={(e) => setDetalhe(e.target.value)}
            rows={2}
            placeholder={tipo === "meta" ? "Por que importa, próximo passo" : "Onde, com quem, o que já está pago"}
            className="input-field resize-none"
          />
        </label>

        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs font-bold text-brand-700">{tipo === "meta" ? "Prazo" : "De"}</span>
            <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="input-field" />
          </label>
          {tipo === "agenda" && (
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs font-bold text-brand-700">Até</span>
              <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="input-field" />
            </label>
          )}
        </div>

        {tipo === "meta" && (
          <>
            <p className="text-[11px] leading-snug text-brand-400">
              Se der para contar, conte: meta com número mostra progresso e para de ser promessa vaga.
            </p>
            <div className="flex gap-2">
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-xs font-bold text-brand-700">Feito</span>
                <input
                  inputMode="numeric"
                  value={progresso}
                  onChange={(e) => setProgresso(e.target.value)}
                  placeholder="0"
                  className="input-field"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-xs font-bold text-brand-700">Alvo</span>
                <input
                  inputMode="numeric"
                  value={alvo}
                  onChange={(e) => setAlvo(e.target.value)}
                  placeholder="12"
                  className="input-field"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-xs font-bold text-brand-700">Unidade</span>
                <input
                  value={unidade}
                  onChange={(e) => setUnidade(e.target.value)}
                  placeholder="livros"
                  className="input-field"
                />
              </label>
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
}

function Escolha({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex-1 rounded-xl px-3 py-2 text-xs font-bold",
        ativo ? "bg-brand-500 text-white" : "bg-cream-100 text-brand-600"
      )}
    >
      {children}
    </button>
  );
}
