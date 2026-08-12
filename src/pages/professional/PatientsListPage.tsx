import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToLinkedPatients, linkPatientByCode } from "@/services/patients";
import { getPatientsOverview, type PatientOverview } from "@/services/professionalOverview";
import { TopBar } from "@/components/common/TopBar";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/common/Badge";
import { BottomSheet } from "@/components/common/BottomSheet";
import { PatientImportSheet } from "@/components/professional/PatientImportSheet";
import { useToast } from "@/contexts/ToastContext";
import { FEELING_OPTIONS } from "@/utils/constants";
import clsx from "clsx";

type Filter = "all" | "active" | "pending" | "late" | "no_access" | "alert";

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

  const filtered = useMemo(() => {
    return overview
      .filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))
      .filter((o) => {
        if (filter === "pending") return o.todayPending > 0;
        if (filter === "late") return o.todayLate > 0;
        if (filter === "no_access") return !o.lastAccessAt || Date.now() - o.lastAccessAt.getTime() > 3 * 86400000;
        if (filter === "alert") return o.hasAttentionAlert;
        return true;
      });
  }, [overview, search, filter]);

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

  return (
    <div>
      <TopBar
        title="Pacientes"
        action={
          <div className="flex gap-1.5">
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

      <div className="px-4 pb-4">
        {loading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <EmptyState icon="🧑‍🤝‍🧑" title="Nenhum paciente encontrado" description="Ajuste os filtros ou vincule um novo paciente." />
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((p) => {
              const feelingOption = p.lastFeeling ? FEELING_OPTIONS.find((f) => f.key === p.lastFeeling) : null;
              return (
                <button key={p.patientId} onClick={() => navigate(`/pacientes/${p.patientId}`)} className="card flex items-center gap-3 text-left">
                  {p.photoURL ? (
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

      {importOpen && firebaseUser && (
        <PatientImportSheet
          professionalId={firebaseUser.uid}
          nomesExistentes={overview.map((o) => o.name)}
          onClose={() => setImportOpen(false)}
        />
      )}

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
