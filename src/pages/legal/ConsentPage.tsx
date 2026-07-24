import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { acceptConsent } from "@/services/privacy";

/** Exibido uma única vez após o primeiro login, antes de liberar o uso do app. */
export function ConsentPage() {
  const { firebaseUser } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      await acceptConsent(firebaseUser.uid);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-container justify-center px-6 py-10">
      <div className="mb-6 text-center">
        <p className="text-3xl">🔒</p>
        <h1 className="mt-2 text-xl font-extrabold text-brand-900">Sua privacidade importa</h1>
        <p className="mt-1 text-sm text-brand-500">
          O ROTA armazena dados sobre sua rotina e seu bem-estar para te ajudar a se acompanhar melhor, com acesso
          restrito à sua profissional responsável.
        </p>
      </div>

      <div className="card flex flex-col gap-2 text-sm text-brand-600">
        <p>• Seus dados nunca são compartilhados com outros pacientes.</p>
        <p>• Sua profissional só acessa os dados de pacientes vinculados a ela.</p>
        <p>• Você pode exportar ou excluir seus dados a qualquer momento.</p>
      </div>

      <label className="mt-4 flex items-start gap-2 text-sm text-brand-600">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-brand-300" />
        <span>
          Li e aceito os{" "}
          <Link to="/termos" className="font-bold text-brand-700" target="_blank">
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link to="/privacidade" className="font-bold text-brand-700" target="_blank">
            Política de Privacidade
          </Link>
          , e consinto com o uso dos meus dados conforme descrito.
        </span>
      </label>

      <button className="btn-primary mt-5" disabled={!accepted || loading} onClick={handleAccept}>
        {loading ? "Confirmando..." : "Continuar"}
      </button>
    </div>
  );
}
