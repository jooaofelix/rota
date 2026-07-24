import { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "@/firebase/auth";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch {
      setError("Não foi possível enviar o e-mail. Confira o endereço digitado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-container justify-center px-6 py-10">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-extrabold text-brand-900">Recuperar senha</h1>
        <p className="mt-1 text-sm text-brand-400">Enviaremos um link para redefinir sua senha.</p>
      </div>

      {sent ? (
        <div className="card text-center">
          <p className="font-bold text-brand-700">E-mail enviado!</p>
          <p className="mt-1 text-sm text-brand-400">Confira sua caixa de entrada para redefinir sua senha.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="Seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
          />
          {error && <p className="text-sm font-semibold text-rose-500">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Enviando..." : "Enviar link de recuperação"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-brand-400">
        <Link to="/login" className="font-bold text-brand-600">
          Voltar para o login
        </Link>
      </p>
    </div>
  );
}
