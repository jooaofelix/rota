import { useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/contexts/AuthContext";
import { logout } from "@/firebase/auth";
import { TopBar } from "@/components/common/TopBar";
import { NotificationPrimer } from "@/components/common/NotificationPrimer";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { currentNotificationPermission } from "@/firebase/messaging";
import { downloadJson, exportPatientData, requestAccountDeletion } from "@/services/privacy";
import { useToast } from "@/contexts/ToastContext";
import type { NotificationPreferences } from "@/types";

const DEFAULT_PREFS: NotificationPreferences = {
  activityUpcoming: true,
  activityDue: true,
  activityLate: true,
  periodSummary: true,
  newActivity: true,
  activityChanged: true,
  newMessage: true,
  newReward: true,
  rewardAchieved: true,
  medicationReminder: true,
  dailySummary: true,
};

const PREF_LABELS: Record<keyof NotificationPreferences, string> = {
  activityUpcoming: "Atividade se aproximando",
  activityDue: "Atividade no horário",
  activityLate: "Atividade atrasada",
  periodSummary: "Resumo do período (manhã/tarde/noite)",
  newActivity: "Nova atividade adicionada",
  activityChanged: "Atividade alterada",
  newMessage: "Nova mensagem da profissional",
  newReward: "Nova recompensa disponível",
  rewardAchieved: "Recompensa conquistada",
  medicationReminder: "Lembrete de medicação",
  dailySummary: "Resumo do dia",
};

/**
 * Onze interruptores separados era escolha demais para uma decisão simples. A tela
 * mostra quatro grupos; quem quiser mesmo mexer item por item abre "Ajustar em detalhe".
 * O formato salvo em `notificationPrefs` não mudou — só o jeito de apresentar.
 */
const PREF_GROUPS: Array<{
  id: string;
  label: string;
  description: string;
  icon: string;
  keys: Array<keyof NotificationPreferences>;
}> = [
  {
    id: "reminders",
    label: "Lembretes das atividades",
    description: "Quando uma atividade está chegando, é a hora dela ou passou do horário.",
    icon: "⏰",
    keys: ["activityUpcoming", "activityDue", "activityLate", "medicationReminder"],
  },
  {
    id: "professional",
    label: "Recados da profissional",
    description: "Mensagens dela e mudanças na sua rotina.",
    icon: "💬",
    keys: ["newMessage", "newActivity", "activityChanged"],
  },
  {
    id: "rewards",
    label: "Recompensas",
    description: "Quando você conquista algo ou aparece uma recompensa nova.",
    icon: "🏆",
    keys: ["newReward", "rewardAchieved"],
  },
  {
    id: "summaries",
    label: "Resumos",
    description: "Um resumo por período do dia e outro no fim do dia.",
    icon: "📋",
    keys: ["periodSummary", "dailySummary"],
  },
];

export function PatientProfilePage() {
  const { firebaseUser, userDoc } = useAuth();
  const { showToast } = useToast();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [showPrefDetail, setShowPrefDetail] = useState(false);
  const permission = currentNotificationPermission();
  const prefs = userDoc?.notificationPrefs ?? DEFAULT_PREFS;

  async function handleCopyCode() {
    if (!firebaseUser) return;
    await navigator.clipboard.writeText(firebaseUser.uid);
    showToast("Código copiado!");
  }

  async function savePrefs(next: NotificationPreferences) {
    if (!firebaseUser) return;
    await updateDoc(doc(db, "users", firebaseUser.uid), { notificationPrefs: next });
  }

  function togglePref(key: keyof NotificationPreferences) {
    return savePrefs({ ...prefs, [key]: !prefs[key] });
  }

  /** Um grupo conta como ligado se qualquer item dele estiver ligado; desligar apaga todos. */
  function toggleGroup(keys: Array<keyof NotificationPreferences>) {
    const turningOff = keys.some((k) => prefs[k]);
    const next = { ...prefs };
    keys.forEach((k) => {
      next[k] = !turningOff;
    });
    return savePrefs(next);
  }

  async function handleExport() {
    if (!firebaseUser) return;
    const data = await exportPatientData(firebaseUser.uid);
    downloadJson(`rota-meus-dados-${firebaseUser.uid}.json`, data);
    showToast("Seus dados foram exportados.");
  }

  async function handleDelete() {
    if (!firebaseUser) return;
    await requestAccountDeletion(firebaseUser.uid, "patient");
    setConfirmingDelete(false);
    await logout();
  }

  return (
    <div>
      <TopBar title="Perfil" subtitle={userDoc?.name} />

      <div className="flex flex-col gap-4 px-4 pb-4">
        <div className="card flex items-center gap-3">
          {userDoc?.photoURL ? (
            <img src={userDoc.photoURL} alt="" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-2xl">👤</div>
          )}
          <div>
            <p className="font-bold text-brand-900">{userDoc?.name}</p>
            <p className="text-sm text-brand-400">{userDoc?.email}</p>
          </div>
        </div>

        <div className="card">
          <p className="font-bold text-brand-800">Seu código</p>
          <p className="mt-1 text-sm text-brand-500">
            Compartilhe esse código com sua profissional para ela te vincular à conta dela.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-700">{firebaseUser?.uid}</code>
            <button onClick={handleCopyCode} className="shrink-0 rounded-xl bg-brand-500 px-3 py-2 text-xs font-bold text-white">
              Copiar
            </button>
          </div>
        </div>

        {permission !== "granted" && firebaseUser && <NotificationPrimer uid={firebaseUser.uid} />}

        <div className="card">
          <p className="font-bold text-brand-800">Notificações</p>
          <p className="mb-3 mt-0.5 text-sm text-brand-500">Escolha o que vale te avisar.</p>

          <div className="flex flex-col gap-1">
            {PREF_GROUPS.map((group) => (
              <SwitchRow
                key={group.id}
                icon={group.icon}
                label={group.label}
                description={group.description}
                checked={group.keys.some((k) => prefs[k])}
                onToggle={() => toggleGroup(group.keys)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowPrefDetail((v) => !v)}
            className="mt-3 text-xs font-bold text-brand-500 underline-offset-2 hover:underline"
          >
            {showPrefDetail ? "Esconder detalhes" : "Ajustar em detalhe"}
          </button>

          {showPrefDetail && (
            <div className="mt-2 flex flex-col gap-2 border-t border-brand-50 pt-3">
              {(Object.keys(PREF_LABELS) as Array<keyof NotificationPreferences>).map((key) => (
                <label key={key} className="flex items-center justify-between gap-2 text-sm text-brand-600">
                  {PREF_LABELS[key]}
                  <input
                    type="checkbox"
                    checked={prefs[key]}
                    onChange={() => togglePref(key)}
                    className="h-5 w-5 shrink-0 rounded border-brand-300"
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="card flex flex-col gap-2">
          <p className="font-bold text-brand-800">Privacidade e dados</p>
          <Link to="/privacidade" className="text-sm font-semibold text-brand-600">
            Política de Privacidade
          </Link>
          <Link to="/termos" className="text-sm font-semibold text-brand-600">
            Termos de Uso
          </Link>
          <button onClick={handleExport} className="text-left text-sm font-semibold text-brand-600">
            Exportar meus dados
          </button>
          <button onClick={() => setConfirmingDelete(true)} className="text-left text-sm font-semibold text-rose-500">
            Excluir minha conta
          </button>
        </div>

        <button onClick={() => logout()} className="btn-secondary">
          Sair da conta
        </button>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title="Excluir sua conta?"
        description="Isso vai desativar sua conta e iniciar a exclusão dos seus dados. Essa ação não pode ser desfeita."
        confirmLabel="Excluir conta"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}

function SwitchRow({
  icon,
  label,
  description,
  checked,
  onToggle,
}: {
  icon: string;
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className="flex items-center gap-3 rounded-xl px-1 py-2 text-left transition active:bg-brand-50"
    >
      <span className="shrink-0 text-xl">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-brand-800">{label}</span>
        <span className="block text-xs leading-snug text-brand-400">{description}</span>
      </span>
      <span
        className={clsx(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-brand-500" : "bg-brand-100"
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-[1.375rem]" : "translate-x-0.5"
          )}
        />
      </span>
    </button>
  );
}
