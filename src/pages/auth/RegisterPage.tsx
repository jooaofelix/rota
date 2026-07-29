import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerWithEmail } from "@/firebase/auth";

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptedTerms) {
      setError("Para continuar, você precisa aceitar os Termos de Uso e a Política de Privacidade.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await registerWithEmail(name, email, password, "patient");
      navigate("/", { replace: true });
    } catch {
      setError("Não foi possível criar sua conta. Verifique os dados e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-container justify-center px-6 py-10">
      <div className="mb-6 text-center">
        <img src="/logo-wordmark.png" alt="ROTA" className="mx-auto mb-4 h-16 w-auto" />
        <h1 className="text-2xl font-extrabold text-brand-900">Criar conta</h1>
        <p className="mt-1 text-sm text-brand-400">Sua conta de paciente no ROTA.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input required placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
        <input
          type="email"
          required
          placeholder="Seu e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Crie uma senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-field"
        />

        <label className="mt-1 flex items-start gap-2 text-xs text-brand-500">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-brand-300"
          />
          <span>
            Li e aceito os{" "}
            <Link to="/termos" className="font-bold text-brand-600">
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link to="/privacidade" className="font-bold text-brand-600">
              Política de Privacidade
            </Link>
            .
          </span>
        </label>

        {error && <p className="text-sm font-semibold text-rose-500">{error}</p>}

        <button type="submit" className="btn-primary mt-2" disabled={loading}>
          {loading ? "Criando conta..." : "Criar minha conta"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-brand-400">
        Já tem conta?{" "}
        <Link to="/login" className="font-bold text-brand-600">
          Entrar
        </Link>
      </p>
    </div>
  );
}
