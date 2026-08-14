import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToLinkedPatients } from "@/services/patients";
import { getPatientsOverview, type PatientOverview } from "@/services/professionalOverview";
import { TopBar } from "@/components/common/TopBar";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/common/Badge";
import { NotificationsBell } from "@/components/common/NotificationsBell";
import { UpcomingSessions } from "@/components/professional/UpcomingSessions";
import { PendenciasCard } from "@/components/professional/PendenciasCard";
import { BirthdaysCard } from "@/components/professional/BirthdaysCard";
import { GoalsCard } from "@/components/professional/GoalsCard";
import { FEELING_OPTIONS } from "@/utils/constants";

/** Os lugares do aplicativo, reunidos num só ponto de partida. */
const ATALHOS = [
  { to: "/agenda", icon: "🗓️", label: "Agenda", hint: "Semana e agendamentos" },
  { to: "/pacientes", icon: "🧑‍🤝‍🧑", label: "Pacientes", hint: "Lista e perfis" },
  { to: "/prontuarios", icon: "📓", label: "Prontuários", hint: "Registros por paciente" },
  { to: "/rotinas", icon: "📋", label: "Rotinas", hint: "Modelos prontos" },
  { to: "/relatorios", icon: "📄", label: "Relatórios", hint: "Gerar PDF por período" },
  { to: "/materiais", icon: "💛", label: "Materiais", hint: "Enviar entre sessões" },
  { to: "/financas", icon: "💰", label: "Finanças", hint: "Recebido e em aberto" },
];

export function HomePage() {
  const { firebaseUser, userDoc } = useAuth();
  const navigate = useNavigate();
  const [patientIds, setPatientIds] = useState<string[] | null>(null);
  const [todos, setTodos] = useState<PatientOverview[]>([]);
  // Arquivado não entra em contagem de "pacientes ativos" nem em alerta: ninguém
  // precisa ser cobrado por quem já teve alta.
  const overview = useMemo(() => todos.filter((o) => o.active), [todos]);
  const [loadingOverview, setLoadingOverview] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeToLinkedPatients(firebaseUser.uid, (links) => setPatientIds(links.map((l) => l.patientId)));
  }, [firebaseUser]);

  useEffect(() => {
    if (!patientIds) return;
    setLoadingOverview(true);
    getPatientsOverview(patientIds)
      .then(setTodos)
      .finally(() => setLoadingOverview(false));
  }, [patientIds]);

  const stats = useMemo(() => {
    const overview = todos.filter((o) => o.active);
    const withPending = overview.filter((o) => o.todayPending > 0).length;
    const withLate = overview.filter((o) => o.todayLate > 0).length;
    const inactive = overview.filter((o) => {
      if (!o.lastAccessAt) return true;
      return Date.now() - o.lastAccessAt.getTime() > 3 * 86400000;
    }).length;
    const totalScheduled = overview.reduce((acc, o) => acc + o.todayTotal, 0);
    const totalCompleted = overview.reduce((acc, o) => acc + o.todayCompleted, 0);

    const feelingCounts = new Map<string, number>();
    overview.forEach((o) => {
      if (o.lastFeeling) feelingCounts.set(o.lastFeeling, (feelingCounts.get(o.lastFeeling) ?? 0) + 1);
    });

    return {
      active: overview.length,
      withPending,
      withLate,
      inactive,
      completionRate: totalScheduled ? Math.round((totalCompleted / totalScheduled) * 100) : 0,
      topFeelings: Array.from(feelingCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3),
      alerts: overview.filter((o) => o.hasAttentionAlert),
    };
  }, [overview]);

  if (patientIds === null || loadingOverview) return <LoadingSpinner label="Carregando..." />;

  return (
    <div>
      <TopBar
        title={`Olá, ${userDoc?.name?.split(" ")[0] ?? ""}`}
        subtitle="O que precisa da sua atenção hoje"
        action={firebaseUser && <NotificationsBell userId={firebaseUser.uid} />}
      />

      <div className="flex flex-col gap-4 px-4 pb-4">
        {firebaseUser && <UpcomingSessions professionalId={firebaseUser.uid} max={5} />}

        {/* Pendências antes dos atalhos: o que cobra vem antes do que navega. */}
        <PendenciasCard />

        <BirthdaysCard overview={overview} />

        {firebaseUser && <GoalsCard professionalId={firebaseUser.uid} />}

        <div>
          <p className="mb-2 text-sm font-bold text-brand-700">Ir para</p>
          <div className="grid grid-cols-3 gap-2.5">
            {ATALHOS.map((a) => (
              <button
                key={a.to}
                onClick={() => navigate(a.to)}
                className="card flex flex-col items-center gap-1 px-2 py-3 text-center transition active:scale-[0.97]"
              >
                <span className="text-2xl">{a.icon}</span>
                <span className="text-xs font-bold leading-tight text-brand-800">{a.label}</span>
                <span className="text-[10px] leading-tight text-brand-400">{a.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-bold text-brand-700">Seus pacientes hoje</p>
          <div className="grid grid-cols-2 gap-2.5">
            <StatCard label="Pacientes ativos" value={stats.active} icon="🧑‍🤝‍🧑" />
            <StatCard label="Taxa de conclusão hoje" value={`${stats.completionRate}%`} icon="📈" />
            <StatCard label="Com pendências hoje" value={stats.withPending} icon="🕐" />
            <StatCard label="Com atrasos hoje" value={stats.withLate} icon="⏰" />
          </div>
        </div>

        {stats.inactive > 0 && (
          <div className="card border-2 border-amber-200 bg-amber-50">
            <p className="text-sm font-bold text-amber-800">
              ⚠️ {stats.inactive} paciente(s) sem acessar há 3+ dias
            </p>
          </div>
        )}

        {stats.alerts.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-bold text-brand-700">Alertas importantes</p>
            <div className="flex flex-col gap-2">
              {stats.alerts.map((o) => (
                <button
                  key={o.patientId}
                  onClick={() => navigate(`/pacientes/${o.patientId}`)}
                  className="card flex items-center justify-between text-left"
                >
                  <div>
                    <p className="text-sm font-bold text-brand-800">{o.name}</p>
                    <p className="text-xs text-brand-400">{o.alerts[0]}</p>
                  </div>
                  <Badge tone="warning">Atenção</Badge>
                </button>
              ))}
            </div>
          </div>
        )}

        {stats.topFeelings.length > 0 && (
          <div className="card">
            <p className="mb-2 text-sm font-bold text-brand-700">Sentimentos mais registrados</p>
            <div className="flex gap-4">
              {stats.topFeelings.map(([key, count]) => {
                const option = FEELING_OPTIONS.find((f) => f.key === key);
                return (
                  <div key={key} className="flex flex-col items-center gap-1">
                    <span className="text-2xl">{option?.emoji}</span>
                    <span className="text-xs font-bold text-brand-500">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {overview.length === 0 && (
          <EmptyState
            icon="🌱"
            title="Nenhum paciente vinculado ainda"
            description="Vá até Pacientes para vincular seu primeiro paciente."
          />
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="card">
      <p className="text-xl">{icon}</p>
      <p className="mt-1 text-xl font-extrabold text-brand-900">{value}</p>
      <p className="text-xs text-brand-400">{label}</p>
    </div>
  );
}
