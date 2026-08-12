import { Suspense, lazy, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { excluirPacientes, setPatientActive, subscribeToPatient, subscribeToUser } from "@/services/patients";
import { sendMessageToPatient } from "@/services/messages";
import type { PatientDoc, UserDoc } from "@/types";
import { TopBar } from "@/components/common/TopBar";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { BottomSheet } from "@/components/common/BottomSheet";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PatientRoutineTab } from "@/components/professional/PatientRoutineTab";
import { PatientHistoryTab } from "@/components/professional/PatientHistoryTab";
import { PatientRewardsTab } from "@/components/professional/PatientRewardsTab";
import { PatientNotesTab } from "@/components/professional/PatientNotesTab";
import { ReferralTab } from "@/components/professional/ReferralTab";
import { AssessmentsTab } from "@/components/professional/AssessmentsTab";
import { AccessCodeCard } from "@/components/professional/AccessCodeCard";
import { useToast } from "@/contexts/ToastContext";
import clsx from "clsx";

// Carregada sob demanda: usa recharts, que não deve entrar no bundle inicial do app.
const PatientOverviewTab = lazy(() => import("@/components/professional/PatientOverviewTab").then((m) => ({ default: m.PatientOverviewTab })));

type Tab = "overview" | "routine" | "history" | "tests" | "rewards" | "notes" | "referral";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "overview", label: "Visão geral" },
  { key: "routine", label: "Rotina" },
  { key: "history", label: "Histórico" },
  { key: "tests", label: "Testes" },
  { key: "rewards", label: "Recompensas" },
  { key: "notes", label: "Observações" },
  { key: "referral", label: "Encaminhar" },
];

export function PatientDetailPage() {
  const { patientId = "" } = useParams();
  const { firebaseUser, userDoc } = useAuth();
  const { showToast } = useToast();
  const [patient, setPatient] = useState<PatientDoc | null>(null);
  const [user, setUser] = useState<UserDoc | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [messageSheetOpen, setMessageSheetOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [confirmandoInativar, setConfirmandoInativar] = useState(false);
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = [subscribeToPatient(patientId, setPatient), subscribeToUser(patientId, setUser)];
    return () => unsub.forEach((u) => u());
  }, [patientId]);

  // Paciente sem conta não tem documento em /users — o nome vem do cadastro que
  // a profissional fez. Esperar pelo usuário aqui deixava a tela girando para
  // sempre em todo mundo que veio da importação.
  const nome = user?.name ?? patient?.name;
  if (!nome || !firebaseUser) return <LoadingSpinner label="Carregando paciente..." />;

  async function handleSendMessage() {
    if (!messageText.trim() || !firebaseUser) return;
    setSendingMessage(true);
    try {
      await sendMessageToPatient(firebaseUser.uid, patientId, messageText.trim());
      showToast("Mensagem enviada ao paciente.");
      setMessageText("");
      setMessageSheetOpen(false);
    } finally {
      setSendingMessage(false);
    }
  }

  return (
    <div>
      <TopBar
        title={nome}
        subtitle={`⭐ ${patient?.points ?? 0} pontos · 🔥 ${patient?.currentStreak ?? 0} dias`}
        back
        action={
          user ? (
            <button onClick={() => setMessageSheetOpen(true)} className="rounded-full bg-brand-500 px-3 py-1.5 text-xs font-bold text-white">
              💬 Mensagem
            </button>
          ) : undefined
        }
      />

      <div className="flex gap-2 overflow-x-auto px-4 pb-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              "shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition",
              tab === t.key ? "bg-brand-500 text-white" : "bg-white text-brand-500"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-4">
        {/* Inativo continua com tudo: a tarja avisa por que a pessoa não aparece
            mais na lista, sem esconder o histórico dela. */}
        {patient?.active === false && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-cream-200 p-3">
            <span className="text-lg">📁</span>
            <p className="min-w-0 flex-1 text-xs leading-snug text-brand-600">
              Acompanhamento inativo. O histórico continua inteiro; ela só não aparece na lista de
              pacientes ativos.
            </p>
            <button
              onClick={() => setPatientActive(patientId, true)}
              className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-brand-600"
            >
              Reativar
            </button>
          </div>
        )}

        {tab === "overview" && patient && !patient.hasAccount && (
          <div className="mb-4">
            <AccessCodeCard patient={patient} patientName={nome} />
          </div>
        )}
        {tab === "overview" && (
          <Suspense fallback={<LoadingSpinner label="Carregando indicadores..." />}>
            <PatientOverviewTab patientId={patientId} />
          </Suspense>
        )}
        {tab === "routine" && <PatientRoutineTab patientId={patientId} professionalId={firebaseUser.uid} />}
        {tab === "history" && <PatientHistoryTab patientId={patientId} />}
        {tab === "tests" && (
          <AssessmentsTab
            professionalId={firebaseUser.uid}
            professionalName={userDoc?.name ?? "Sua psicóloga"}
            patientId={patientId}
            patientName={nome}
          />
        )}
        {tab === "rewards" && <PatientRewardsTab patientId={patientId} professionalId={firebaseUser.uid} />}
        {tab === "notes" && <PatientNotesTab patientId={patientId} initialNotes={patient?.privateNotes ?? ""} />}
        {tab === "referral" && <ReferralTab patientId={patientId} patientName={nome} />}

        {tab === "overview" && (
          <div className="mt-4 flex flex-col gap-3">
            {patient?.active !== false && (
              <button
                onClick={() => setConfirmandoInativar(true)}
                className="w-full text-center text-sm font-bold text-brand-400"
              >
                Marcar como inativo
              </button>
            )}
            <button
              onClick={() => setConfirmandoExcluir(true)}
              className="w-full text-center text-sm font-bold text-rose-400"
            >
              Excluir cadastro
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmandoInativar}
        title={`Marcar ${nome} como inativa?`}
        description="Ela sai da lista de pacientes ativos, mas o histórico continua inteiro — sessões, prontuário, cobranças e testes. Dá para reativar a qualquer momento."
        confirmLabel="Marcar como inativa"
        onCancel={() => setConfirmandoInativar(false)}
        onConfirm={async () => {
          setConfirmandoInativar(false);
          try {
            await setPatientActive(patientId, false);
            showToast("Paciente marcada como inativa.");
          } catch {
            showToast("Não consegui salvar. Tente de novo.", "error");
          }
        }}
      />

      <ConfirmDialog
        open={confirmandoExcluir}
        danger
        title={`Excluir o cadastro de ${nome}?`}
        description="Some tudo: sessões, prontuário, cobranças e testes. Não dá para desfazer. Se ela tiver conta própria, o que acontece é o desvínculo — a conta é dela. Se o objetivo é só tirar da lista, use 'Marcar como inativo'."
        confirmLabel={excluindo ? "Excluindo..." : "Excluir tudo"}
        onCancel={() => setConfirmandoExcluir(false)}
        onConfirm={async () => {
          setExcluindo(true);
          try {
            const r = await excluirPacientes([patientId]);
            showToast(r.desvinculados ? "Paciente desvinculada." : "Cadastro excluído.");
            navigate("/pacientes");
          } catch {
            showToast("Não consegui excluir. Tente de novo.", "error");
            setExcluindo(false);
            setConfirmandoExcluir(false);
          }
        }}
      />

      <BottomSheet open={messageSheetOpen} onClose={() => setMessageSheetOpen(false)} title={`Mensagem para ${nome}`}>
        <div className="flex flex-col gap-3">
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            rows={4}
            className="input-field resize-none"
            placeholder="Escreva um aviso ou mensagem de incentivo..."
          />
          <button className="btn-primary" onClick={handleSendMessage} disabled={sendingMessage || !messageText.trim()}>
            {sendingMessage ? "Enviando..." : "Enviar mensagem"}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
