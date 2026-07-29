import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { completeGoogleRedirectSignIn, loginWithEmail, loginWithGoogle } from "@/firebase/auth";
import { isFirebaseConfigured } from "@/firebase/config";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // O login com Google volta pra cá depois de redirecionar pelo Google — completa o
  // cadastro/login aqui. (PublicOnly cuida de navegar assim que o usuário for reconhecido.)
  useEffect(() => {
    completeGoogleRedirectSignIn().catch((err) => {
      setError(`Não foi possível entrar com o Google. (${err?.code ?? err?.message ?? "erro desconhecido"})`);
    });
  }, []);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      navigate("/", { replace: true });
    } catch {
      setError("E-mail ou senha inválidos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    setLoading(true);
    try {
      // Redireciona para o Google; a página sai daqui e volta depois do login.
      await loginWithGoogle();
    } catch (err: any) {
      setError(`Não foi possível entrar com o Google. (${err?.code ?? err?.message ?? "erro desconhecido"})`);
      setLoading(false);
    }
  }

  return (
    <div className="app-container justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500 text-3xl text-white shadow-card">
          🌿
        </div>
        <h1 className="text-2xl font-extrabold text-brand-900">ROTA</h1>
        <p className="mt-1 text-sm text-brand-400">Sua rotina, um passo de cada vez.</p>
      </div>

      {!isFirebaseConfigured && (
        <div className="mb-4 rounded-2xl bg-amber-100 p-3 text-xs font-semibold text-amber-800">
          O Firebase ainda não foi configurado neste ambiente. Preencha o arquivo .env com as chaves do seu projeto.
        </div>
      )}

      <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="Seu e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
          autoComplete="email"
        />
        <input
          type="password"
          required
          placeholder="Sua senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-field"
          autoComplete="current-password"
        />
        {error && <p className="text-sm font-semibold text-rose-500">{error}</p>}
        <Link to="/esqueci-senha" className="self-end text-sm font-bold text-brand-500">
          Esqueci minha senha
        </Link>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs font-semibold text-brand-300">
        <div className="h-px flex-1 bg-brand-100" />
        ou
        <div className="h-px flex-1 bg-brand-100" />
      </div>

      <button onClick={handleGoogleLogin} className="btn-secondary" disabled={loading}>
        <span className="text-lg">🔵</span> Entrar com Google
      </button>

      <p className="mt-6 text-center text-sm text-brand-400">
        Ainda não tem conta?{" "}
        <Link to="/cadastro" className="font-bold text-brand-600">
          Criar conta de paciente
        </Link>
      </p>
    </div>
  );
}
