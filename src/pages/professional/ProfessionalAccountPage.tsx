import { useState } from "react";
import { Link } from "react-router-dom";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/contexts/AuthContext";
import { logout } from "@/firebase/auth";
import { TopBar } from "@/components/common/TopBar";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { NotificationPrimer } from "@/components/common/NotificationPrimer";
import { FiscalProfileSheet } from "@/components/professional/FiscalProfileSheet";
import { currentNotificationPermission } from "@/firebase/messaging";
import { requestAccountDeletion } from "@/services/privacy";
import { useToast } from "@/contexts/ToastContext";

export function ProfessionalAccountPage() {
  const { firebaseUser, userDoc } = useAuth();
  const { showToast } = useToast();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [profession, setProfession] = useState("");
  const [fiscalAberto, setFiscalAberto] = useState(false);
  const permission = currentNotificationPermission();

  async function handleSaveProfession() {
    if (!firebaseUser) return;
    await setDoc(doc(db, "professionals", firebaseUser.uid), { uid: firebaseUser.uid, profession }, { merge: true });
    showToast("Informação salva.");
  }

  async function handleDelete() {
    if (!firebaseUser) return;
    await requestAccountDeletion(firebaseUser.uid, "professional");
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
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-2xl">👩‍⚕️</div>
          )}
          <div>
            <p className="font-bold text-brand-900">{userDoc?.name}</p>
            <p className="text-sm text-brand-400">{userDoc?.email}</p>
          </div>
        </div>

        {permission !== "granted" && firebaseUser && <NotificationPrimer uid={firebaseUser.uid} />}

        <div className="card flex flex-col gap-2">
          <p className="font-bold text-brand-800">Profissão / especialidade</p>
          <input value={profession} onChange={(e) => setProfession(e.target.value)} placeholder="Ex: Psicóloga, Terapeuta Ocupacional..." className="input-field" />
          <button className="btn-secondary" onClick={handleSaveProfession}>
            Salvar
          </button>
        </div>

        <div className="card flex flex-col gap-2">
          <p className="font-bold text-brand-800">Dados fiscais</p>
          <p className="text-sm leading-snug text-brand-400">
            CNPJ ou CPF, inscrição municipal e código do serviço. É o que a emissão de nota e o
            recibo exigem — e fica só com você.
          </p>
          <button className="btn-secondary" onClick={() => setFiscalAberto(true)}>
            Preencher
          </button>
        </div>

        <div className="card flex flex-col gap-2">
          <p className="font-bold text-brand-800">Privacidade e dados</p>
          <Link to="/privacidade" className="text-sm font-semibold text-brand-600">
            Política de Privacidade
          </Link>
          <Link to="/termos" className="text-sm font-semibold text-brand-600">
            Termos de Uso
          </Link>
          <button onClick={() => setConfirmingDelete(true)} className="text-left text-sm font-semibold text-rose-500">
            Excluir minha conta
          </button>
        </div>

        <button onClick={() => logout()} className="btn-secondary">
          Sair da conta
        </button>
      </div>

      {fiscalAberto && firebaseUser && (
        <FiscalProfileSheet uid={firebaseUser.uid} onClose={() => setFiscalAberto(false)} />
      )}

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
