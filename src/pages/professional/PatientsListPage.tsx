import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { excluirPacientes, linkPatientByCode, setPatientActive, subscribeToLinkedPatients } from "@/services/patients";
import { getPatientsOverview, type PatientOverview } from "@/services/professionalOverview";
import { TopBar } from "@/components/common/TopBar";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/common/Badge";
import { BottomSheet } from "@/components/common/BottomSheet";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PatientImportSheet } from "@/components/professional/PatientImportSheet";
import { useToast } from "@/contexts/ToastContext";
import { FEELING_OPTIONS } from "@/utils/constants";
import clsx from "clsx";

type Filter = "all" | "pending" | "late" | "no_access" | "alert" | "inativos";

export function PatientsListPage() {
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [patientIds, setPatientIds] = useState<string[] | null>(null);
  const [overview, setOverview] = useState<PatientOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [linkSheetOpen, setLinkSheetOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [linkCode, setLinkCode] = useState("");
  const [linking, setLinking] = useState(false);
  const [selecionando, setSelecionando] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [progresso, setProgresso] = useState<{ feitos: number; total: number } | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeToLinkedPatients(firebaseUser.uid, (links) => setPatientIds(links.map((l) => l.patientId)));
  }, [firebaseUser]);

  useEffect(() => {
    if (!patientIds) return;
    setLoading(true);
    getPatientsOverview(patientIds)
      .then(setOverview)
      .finally(() => setLoading(false));
  }, [patientIds]);

  const inativos = useMemo(() => overview.filter((o) => !o.active).length, [overview]);

  const filtered = useMemo(() => {
    return overview
      .filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))
      // Inativo só aparece quando ela pede: quem teve alta não deveria continuar
      // ocupando a lista de quem está em acompanhamento.
      .filter((o) => (filter === "inativos" ? !o.active : o.active))
      .filter((o) => {
        if (filter === "pending") return o.todayPending > 0;
        if (filter === "late") return o.todayLate > 0;
        if (filter === "no_access") return !o.lastAccessAt || Date.now() - o.lastAccessAt.getTime() > 3 * 86400000;
        if (filter === "alert") return o.hasAttentionAlert;
        return true;
      });
  }, [overview, search, filter]);

  // "Todos" é sempre o que está na tela, nunca a base inteira: marcar todos com um
  // filtro aplicado e apagar mais gente do que aparecia seria uma armadilha.
  const todosVisiveisMarcados = filtered.length > 0 && filtered.every((p) => selecionados.has(p.patientId));

  function sairDaSelecao() {
    setSelecionando(false);
    setSelecionados(new Set());
  }

  function alternarSelecao(patientId: string) {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(patientId)) novo.delete(patientId);
      else novo.add(patientId);
      return novo;
    });
  }

  async function handleLink(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseUser) return;
    setLinking(true);
    try {
      const result = await linkPatientByCode(firebaseUser.uid, linkCode.trim());
      if (result === "linked") {
        showToast("Paciente vinculado com sucesso!");
        setLinkSheetOpen(false);
        setLinkCode("");
      } else {
        showToast("Código inválido. Peça para o paciente copiar o código dele em Perfil > Seu código.", "error");
      }
    } finally {
      setLinking(false);
    }
  }

  async function inativarSelecionados() {
    const ids = [...selecionados];
    await Promise.all(ids.map((id) => setPatientActive(id, false)));
    setOverview((prev) => prev.map((o) => (selecionados.has(o.patientId) ? { ...o, active: false } : o)));
    showToast(`${ids.length} ${ids.length === 1 ? "paciente marcado" : "pacientes marcados"} como inativo.`);
    sairDaSelecao();
  }

  async function excluirSelecionados() {
    if (excluindo) return;
    setExcluindo(true);
    setProgresso(null);
    try {
      const r = await excluirPacientes([...selecionados], (feitos, total) => setProgresso({ feitos, total }));
      const partes = [];
      if (r.excluidos) partes.push(`${r.excluidos} ${r.excluidos === 1 ? "excluído" : "excluídos"}`);
      if (r.desvinculados)
        partes.push(`${r.desvinculados} ${r.desvinculados === 1 ? "desvinculado" : "desvinculados"} (tem conta própria)`);
      // Quando a função responde mas não apaga nada, o motivo é sempre o mesmo:
      // ela não achou o vínculo ativo. Dizer isso é melhor que "nada aconteceu".
      if (r.erros.length) partes.push(`${r.erros.length} sem vínculo ativo (não excluído)`);
      showToast(partes.join(" · ") || "A função respondeu, mas não excluiu nada.");
      setConfirmandoExclusao(false);
      sairDaSelecao();
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Não consegui excluir.", "error");
      setConfirmandoExclusao(false);
    } finally {
      setExcluindo(false);
      setProgresso(null);
    }
  }

  return (
    <div>
      <TopBar
        title="Pacientes"
        action={
          selecionando ? (
            <button onClick={sairDaSelecao} className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-600">
              Cancelar
            </button>
          ) : (
            <div className="flex gap-1.5">
              <button
                onClick={() => setSelecionando(true)}
                className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-600"
              >
                Selecionar
              </button>
              <button
                onClick={() => setImportOpen(true)}
                className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-600"
              >
                Importar
              </button>
              <button
                onClick={() => setLinkSheetOpen(true)}
                className="rounded-full bg-brand-500 px-3 py-1.5 text-xs font-bold text-white"
              >
                + Vincular
              </button>
            </div>
          )
        }
      />

      <div className="px-4 pb-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome..."
          className="input-field"
        />
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {(
            [
              { key: "all", label: "Todos" },
              { key: "pending", label: "Pendentes" },
              { key: "late", label: "Atrasados" },
              { key: "no_access", label: "Sem acesso recente" },
              { key: "alert", label: "Com alerta" },
              ...(inativos > 0 ? [{ key: "inativos" as Filter, label: `Inativos (${inativos})` }] : []),
            ] as Array<{ key: Filter; label: string }>
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={clsx(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold",
                filter === f.key ? "bg-brand-500 text-white" : "bg-white text-brand-500"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {selecionando && (
        <div className="flex items-center justify-between gap-2 px-4 pb-2">
          <p className="text-xs font-bold text-brand-600">
            {selecionados.size} {selecionados.size === 1 ? "selecionado" : "selecionados"}
          </p>
          <button
            onClick={() =>
              setSelecionados(todosVisiveisMarcados ? new Set() : new Set(filtered.map((p) => p.patientId)))
            }
            className="text-xs font-bold text-brand-500"
          >
            {todosVisiveisMarcados ? "Limpar seleção" : `Selecionar todos (${filtered.length})`}
          </button>
        </div>
      )}

      <div className={clsx("px-4", selecionando && selecionados.size > 0 ? "pb-32" : "pb-4")}>
        {loading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <EmptyState icon="🧑‍🤝‍🧑" title="Nenhum paciente encontrado" description="Ajuste os filtros ou vincule um novo paciente." />
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((p) => {
              const feelingOption = p.lastFeeling ? FEELING_OPTIONS.find((f) => f.key === p.lastFeeling) : null;
              const marcado = selecionados.has(p.patientId);
              return (
                <button
                  key={p.patientId}
                  onClick={() =>
                    selecionando ? alternarSelecao(p.patientId) : navigate(`/pacientes/${p.patientId}`)
                  }
                  className={clsx(
                    "card flex items-center gap-3 text-left",
                    selecionando && marcado && "ring-2 ring-brand-500"
                  )}
                >
                  {selecionando ? (
                    <span
                      className={clsx(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-xs font-bold",
                        marcado ? "border-brand-500 bg-brand-500 text-white" : "border-brand-200"
                      )}
                    >
                      {marcado ? "✓" : ""}
                    </span>
                  ) : p.photoURL ? (
                    <img src={p.photoURL} className="h-12 w-12 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-xl">👤</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-bold text-brand-900">{p.name}</p>
                      {p.hasAttentionAlert && <Badge tone="warning">Atenção</Badge>}
                    </div>
                    <p className="text-xs text-brand-400">
                      Hoje: {p.todayCompleted}/{p.todayTotal} · Semana: {p.weekCompletionRate}%
                    </p>
                    <p className="text-xs text-brand-400">
                      {p.todayPending} pendente(s) · {p.todayLate} atrasada(s)
                    </p>
                  </div>
                  {feelingOption && <span className="text-2xl">{feelingOption.emoji}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Barra de ações: só aparece com algo selecionado, e fica presa acima da
          navegação para não sumir no fim de uma lista de oitenta nomes. */}
      {selecionando && selecionados.size > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-20 border-t border-brand-100 bg-white px-4 py-3 shadow-card">
          <div className="mx-auto flex max-w-md gap-2">
            <button onClick={inativarSelecionados} className="btn-secondary">
              Marcar inativo
            </button>
            <button
              onClick={() => setConfirmandoExclusao(true)}
              className="flex w-full items-center justify-center rounded-2xl bg-rose-500 px-4 py-3.5 text-base font-bold text-white active:scale-[0.98]"
            >
              Excluir
            </button>
          </div>
        </div>
      )}

      {importOpen && firebaseUser && (
        <PatientImportSheet professionalId={firebaseUser.uid} onClose={() => setImportOpen(false)} />
      )}

      <ConfirmDialog
        open={confirmandoExclusao}
        danger
        busy={excluindo}
        title={`Excluir ${selecionados.size} ${selecionados.size === 1 ? "cadastro" : "cadastros"}?`}
        description="Some tudo: sessões, prontuário e cobranças dessas pessoas. Não dá para desfazer. Quem tiver conta própria só é desvinculado. Se o objetivo é tirar da lista quem teve alta, use 'Marcar inativo' — o histórico continua guardado."
        confirmLabel={
          excluindo
            ? progresso
              ? `Excluindo ${progresso.feitos} de ${progresso.total}...`
              : "Excluindo..."
            : "Excluir tudo"
        }
        onCancel={() => setConfirmandoExclusao(false)}
        onConfirm={excluirSelecionados}
      />

      <BottomSheet open={linkSheetOpen} onClose={() => setLinkSheetOpen(false)} title="Vincular paciente">
        <form onSubmit={handleLink} className="flex flex-col gap-3">
          <p className="text-sm text-brand-500">
            Peça para o paciente abrir <strong>Perfil &gt; Seu código</strong> no app dele, copiar o código e colar aqui.
          </p>
          <input
            required
            value={linkCode}
            onChange={(e) => setLinkCode(e.target.value)}
            placeholder="Cole o código do paciente"
            className="input-field"
          />
          <button type="submit" className="btn-primary" disabled={linking}>
            {linking ? "Vinculando..." : "Vincular paciente"}
          </button>
        </form>
      </BottomSheet>
    </div>
  );
}
