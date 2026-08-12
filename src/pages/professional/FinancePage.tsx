import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import clsx from "clsx";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToSessionsInRange, setPaymentStatus } from "@/services/sessions";
import type { PaymentMethod, SessionDoc } from "@/types";
import { TopBar } from "@/components/common/TopBar";
import { EmptyState } from "@/components/common/EmptyState";
import { ProposalsSection } from "@/components/professional/ProposalsSection";
import { InvoicesSection } from "@/components/professional/InvoicesSection";
import { useToast } from "@/contexts/ToastContext";
import { formatMoney, monthKeyOf, monthLabel } from "@/utils/agenda";
import { formatShortDate, todayKey } from "@/utils/date";

/** Um ano fechado: a linha de evolução usa tudo, as barras só os 6 últimos. */
const MONTHS_BACK = 11;
const BARS_VISIVEIS = 6;

const METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "Pix",
  cash: "Dinheiro",
  card: "Cartão",
  transfer: "Transferência",
  insurance: "Convênio",
  package: "Pacote mensal",
};

const PIE_COLORS = ["#a16207", "#ca8a04", "#0369a1", "#10b981", "#be185d", "#64748b"];

function monthKeysBack(count: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = count; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

export function FinancePage() {
  const { firebaseUser } = useAuth();
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<SessionDoc[]>([]);

  const months = useMemo(() => monthKeysBack(MONTHS_BACK), []);
  const rangeStart = `${months[0]}-01`;
  const rangeEnd = `${months[months.length - 1]}-31`;
  const currentMonth = months[months.length - 1];

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeToSessionsInRange(firebaseUser.uid, rangeStart, rangeEnd, setSessions);
  }, [firebaseUser, rangeStart, rangeEnd]);

  const billable = useMemo(
    () => sessions.filter((s) => s.status !== "cancelled" && s.paymentStatus !== "exempt" && s.price),
    [sessions]
  );

  const resumo = useMemo(() => {
    const doMes = billable.filter((s) => monthKeyOf(s.date) === currentMonth);
    const recebido = doMes.filter((s) => s.paymentStatus === "paid").reduce((a, s) => a + (s.price ?? 0), 0);
    const previsto = doMes.reduce((a, s) => a + (s.price ?? 0), 0);
    const emAberto = previsto - recebido;
    // "Atrasado" é o que já foi atendido e continua sem pagamento.
    const atrasado = billable
      .filter((s) => s.paymentStatus !== "paid" && s.date < todayKey())
      .reduce((a, s) => a + (s.price ?? 0), 0);
    return { recebido, previsto, emAberto, atrasado, sessoesDoMes: doMes.length };
  }, [billable, currentMonth]);

  const porMes = useMemo(
    () =>
      months.map((m) => {
        const doMes = billable.filter((s) => monthKeyOf(s.date) === m);
        const recebido = doMes.filter((s) => s.paymentStatus === "paid").reduce((a, s) => a + (s.price ?? 0), 0);
        const previsto = doMes.reduce((a, s) => a + (s.price ?? 0), 0);
        return {
          mes: monthLabel(m),
          recebido,
          previsto,
          // Quanto valeu, em média, cada atendimento do mês — sobe quando ela
          // reajusta o valor da sessão e cai quando dá desconto.
          ticket: doMes.length ? Math.round(previsto / doMes.length) : 0,
        };
      }),
    [billable, months]
  );

  /**
   * Só os meses que já têm história: enquanto o app é novo, uma linha começando
   * em zero há um ano dá a impressão errada de queda.
   */
  const evolucao = useMemo(() => {
    const primeiro = porMes.findIndex((m) => m.previsto > 0);
    return primeiro === -1 ? [] : porMes.slice(primeiro);
  }, [porMes]);

  const tendencia = useMemo(() => {
    const fechados = evolucao.slice(0, -1); // o mês corrente ainda está incompleto
    const comValor = fechados.filter((m) => m.recebido > 0);
    const media = comValor.length ? comValor.reduce((a, m) => a + m.recebido, 0) / comValor.length : 0;
    const melhor = fechados.reduce<(typeof porMes)[number] | null>(
      (best, m) => (!best || m.recebido > best.recebido ? m : best),
      null
    );
    const atual = porMes[porMes.length - 1];
    const anterior = porMes[porMes.length - 2];
    const variacao =
      anterior && anterior.recebido > 0 ? ((atual.recebido - anterior.recebido) / anterior.recebido) * 100 : null;
    return { media, melhor, variacao, mesAnterior: anterior?.mes ?? "" };
  }, [evolucao, porMes]);

  const porForma = useMemo(() => {
    const totals = new Map<PaymentMethod, number>();
    billable
      .filter((s) => s.paymentStatus === "paid" && monthKeyOf(s.date) === currentMonth && s.paymentMethod)
      .forEach((s) => totals.set(s.paymentMethod!, (totals.get(s.paymentMethod!) ?? 0) + (s.price ?? 0)));
    return Array.from(totals.entries()).map(([method, value]) => ({ nome: METHOD_LABELS[method], value }));
  }, [billable, currentMonth]);

  const pendencias = useMemo(() => {
    const porPaciente = new Map<string, { nome: string; total: number; sessoes: SessionDoc[] }>();
    billable
      .filter((s) => s.paymentStatus !== "paid")
      .forEach((s) => {
        const atual = porPaciente.get(s.patientId) ?? { nome: s.patientName, total: 0, sessoes: [] };
        atual.total += s.price ?? 0;
        atual.sessoes.push(s);
        porPaciente.set(s.patientId, atual);
      });
    return Array.from(porPaciente.values()).sort((a, b) => b.total - a.total);
  }, [billable]);

  async function marcarPago(session: SessionDoc) {
    await setPaymentStatus(session.id, "paid");
    showToast(`${formatMoney(session.price)} de ${session.patientName} registrado.`);
  }

  return (
    <div>
      <TopBar title="Finanças" subtitle={`Referência: ${monthLabel(currentMonth)}`} />

      <div className="flex flex-col gap-4 px-4 pb-4">
        <div className="grid grid-cols-2 gap-2.5">
          <Stat label="Recebido no mês" value={formatMoney(resumo.recebido)} tone="good" />
          <Stat label="Previsto no mês" value={formatMoney(resumo.previsto)} />
          <Stat label="Em aberto" value={formatMoney(resumo.emAberto)} tone={resumo.emAberto > 0 ? "warn" : undefined} />
          <Stat label="Atrasado" value={formatMoney(resumo.atrasado)} tone={resumo.atrasado > 0 ? "bad" : undefined} />
        </div>

        {evolucao.length > 0 && (
          <div className="card">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <p className="text-sm font-bold text-brand-700">Evolução do faturamento</p>
              {tendencia.variacao !== null && (
                <span
                  className={clsx(
                    "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-extrabold",
                    tendencia.variacao >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                  )}
                >
                  {tendencia.variacao >= 0 ? "▲" : "▼"} {Math.abs(tendencia.variacao).toFixed(0)}% vs. {tendencia.mesAnterior}
                </span>
              )}
            </div>
            <p className="mb-3 text-xs text-brand-400">
              A linha cheia é o que entrou; a pontilhada, o que estava agendado. A distância entre
              as duas é a inadimplência do mês.
              {evolucao.length < 3 && " A curva ganha forma conforme os meses passam."}
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolucao} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={4} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                    tickFormatter={compactMoney}
                  />
                  <Tooltip
                    formatter={(v: number, name) => [formatMoney(v), name === "recebido" ? "Recebido" : "Previsto"]}
                    contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,.1)", fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="previsto"
                    stroke="#eab308"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="recebido"
                    stroke="#a16207"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#a16207" }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-brand-100 pt-3">
              <div>
                <p className="text-sm font-extrabold text-brand-900">{formatMoney(tendencia.media)}</p>
                <p className="text-[11px] text-brand-400">Média por mês fechado</p>
              </div>
              {tendencia.melhor && tendencia.melhor.recebido > 0 && (
                <div>
                  <p className="text-sm font-extrabold text-brand-900">
                    {formatMoney(tendencia.melhor.recebido)}
                  </p>
                  <p className="text-[11px] text-brand-400">Melhor mês ({tendencia.melhor.mes})</p>
                </div>
              )}
            </div>

            <div className="mt-3 border-t border-brand-100 pt-3">
              <p className="text-sm font-bold text-brand-700">Valor médio por sessão</p>
              <p className="mb-2 text-xs text-brand-400">
                Média do que foi cobrado em cada atendimento do mês.
              </p>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolucao} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={4} />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                      domain={["dataMin - 20", "dataMax + 20"]}
                      tickFormatter={compactMoney}
                    />
                    <Tooltip
                      formatter={(v: number) => [formatMoney(v), "Valor médio"]}
                      contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,.1)", fontSize: 12 }}
                    />
                    <Line type="monotone" dataKey="ticket" stroke="#0369a1" strokeWidth={2.5} dot={{ r: 2.5, fill: "#0369a1" }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <p className="mb-1 text-sm font-bold text-brand-700">Recebido e previsto por mês</p>
          <p className="mb-3 text-xs text-brand-400">
            A barra clara é o total agendado no mês; a escura, o que já entrou.
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porMes.slice(-BARS_VISIVEIS)} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={54} />
                <Tooltip
                  formatter={(v: number, name) => [formatMoney(v), name === "recebido" ? "Recebido" : "Previsto"]}
                  contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,.1)", fontSize: 12 }}
                />
                <Bar dataKey="previsto" fill="#fde68a" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="recebido" fill="#a16207" radius={[6, 6, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {porForma.length > 0 && (
          <div className="card">
            <p className="mb-2 text-sm font-bold text-brand-700">Como entrou este mês</p>
            <div className="flex items-center gap-3">
              <div className="h-36 w-36 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={porForma} dataKey="value" nameKey="nome" innerRadius={34} outerRadius={62} paddingAngle={2} isAnimationActive={false}>
                      {porForma.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => formatMoney(v)}
                      contentStyle={{ borderRadius: 12, border: "none", fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                {porForma.map((f, i) => (
                  <div key={f.nome} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="min-w-0 flex-1 truncate text-brand-600">{f.nome}</span>
                    <span className="shrink-0 font-bold text-brand-800">{formatMoney(f.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <ProposalsSection />

        <InvoicesSection />

        <div className="card">
          <p className="mb-2 text-sm font-bold text-brand-700">A receber por paciente</p>
          {pendencias.length === 0 ? (
            <p className="py-3 text-center text-sm text-brand-400">Nenhum valor em aberto. 🎉</p>
          ) : (
            <div className="flex flex-col gap-3">
              {pendencias.map((p) => (
                <div key={p.nome}>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-bold text-brand-800">{p.nome}</p>
                    <p className="shrink-0 text-sm font-extrabold text-brand-700">{formatMoney(p.total)}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.sessoes.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => marcarPago(s)}
                        className={clsx(
                          "rounded-full px-2.5 py-1 text-[11px] font-bold",
                          s.date < todayKey() ? "bg-rose-100 text-rose-700" : "bg-brand-50 text-brand-600"
                        )}
                      >
                        {formatShortDate(s.date)} · {formatMoney(s.price)} ✓
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-xs text-brand-400">Toque numa data para dar o pagamento como recebido.</p>
            </div>
          )}
        </div>

        {sessions.length === 0 && (
          <EmptyState
            icon="💸"
            title="Nada para mostrar ainda"
            description="Assim que houver sessões com valor na agenda, os números aparecem aqui."
          />
        )}
      </div>
    </div>
  );
}

/** Eixo Y curto: "R$ 1.350,00" não cabe na largura de um celular. */
function compactMoney(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  return String(value);
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" | "bad" }) {
  return (
    <div className="card">
      <p
        className={clsx(
          "text-lg font-extrabold",
          tone === "good" && "text-emerald-600",
          tone === "warn" && "text-amber-600",
          tone === "bad" && "text-rose-600",
          !tone && "text-brand-900"
        )}
      >
        {value}
      </p>
      <p className="text-xs text-brand-400">{label}</p>
    </div>
  );
}
