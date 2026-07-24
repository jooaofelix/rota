import { Suspense, lazy, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToPatient, subscribeToUser } from "@/services/patients";
import { sendMessageToPatient } from "@/services/messages";
import type { PatientDoc, UserDoc } from "@/types";
import { TopBar } from "@/components/common/TopBar";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { BottomSheet } from "@/components/common/BottomSheet";
import { PatientRoutineTab } from "@/components/professional/PatientRoutineTab";
import { PatientHistoryTab } from "@/components/professional/PatientHistoryTab";
import { PatientRewardsTab } from "@/components/professional/PatientRewardsTab";
import { PatientNotesTab } from "@/components/professional/PatientNotesTab";
import { useToast } from "@/contexts/ToastContext";
import clsx from "clsx";

// Carregada sob demanda: usa recharts, que não deve entrar no bundle inicial do app.
const PatientOverviewTab = lazy(() => import("@/components/professional/PatientOverviewTab").then((m) => ({ default: m.PatientOverviewTab })));

type Tab = "overview" | "routine" | "history" | "rewards" | "notes";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "overview", label: "Visão geral" },
  { key: "routine", label: "Rotina" },
  { key: "history", label: "Histórico" },
  { key: "rewards", label: "Recompensas" },
  { key: "notes", label: "Observações" },
];

export function PatientDetailPage() {
  const { patientId = "" } = useParams();
  const { firebaseUser } = useAuth();
  const { showToast } = useToast();
  const [patient, setPatient] = useState<PatientDoc | null>(null);
  const [user, setUser] = useState<UserDoc | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [messageSheetOpen, setMessageSheetOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    const unsub = [subscribeToPatient(patientId, setPatient), subscribeToUser(patientId, setUser)];
    return () => unsub.forEach((u) => u());
  }, [patientId]);

  if (!user || !firebaseUser) return <LoadingSpinner label="Carregando paciente..." />;

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
        title={user.name}
        subtitle={`⭐ ${patient?.points ?? 0} pontos · 🔥 ${patient?.currentStreak ?? 0} dias`}
        back
        action={
          <button onClick={() => setMessageSheetOpen(true)} className="rounded-full bg-brand-500 px-3 py-1.5 text-xs font-bold text-white">
            💬 Mensagem
          </button>
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
        {tab === "overview" && (
          <Suspense fallback={<LoadingSpinner label="Carregando indicadores..." />}>
            <PatientOverviewTab patientId={patientId} />
          </Suspense>
        )}
        {tab === "routine" && <PatientRoutineTab patientId={patientId} professionalId={firebaseUser.uid} />}
        {tab === "history" && <PatientHistoryTab patientId={patientId} />}
        {tab === "rewards" && <PatientRewardsTab patientId={patientId} professionalId={firebaseUser.uid} />}
        {tab === "notes" && <PatientNotesTab patientId={patientId} initialNotes={patient?.privateNotes ?? ""} />}
      </div>

      <BottomSheet open={messageSheetOpen} onClose={() => setMessageSheetOpen(false)} title={`Mensagem para ${user.name}`}>
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
