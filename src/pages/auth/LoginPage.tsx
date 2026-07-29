import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { completeGoogleRedirectSignIn, loginWithEmail, loginWithGoogle } from "@/firebase/auth";
import { isFirebaseConfigured } from "@/firebase/config";
import { useDesktopMode } from "@/hooks/useDesktopMode";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24 c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039 l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36 c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571 c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { desktopMode, toggleDesktopMode } = useDesktopMode();

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
      <div className="mb-8 text-center animate-fade-in-up">
        <img src="/logo-icon.png" alt="ROTA" className="mx-auto mb-4 h-20 w-20 rounded-2xl shadow-card" />
        <h1 className="text-2xl font-extrabold text-brand-900">ROTA</h1>
        <p className="mt-1 text-sm text-brand-400">Sua rotina, um passo de cada vez.</p>
      </div>

      {!isFirebaseConfigured && (
        <div className="mb-4 rounded-2xl bg-amber-100 p-3 text-xs font-semibold text-amber-800">
          O Firebase ainda não foi configurado neste ambiente. Preencha o arquivo .env com as chaves do seu projeto.
        </div>
      )}

      <form
        onSubmit={handleEmailLogin}
        className="flex flex-col gap-3 animate-fade-in-up"
        style={{ animationDelay: "80ms" }}
      >
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

      <div
        className="my-5 flex items-center gap-3 text-xs font-semibold text-brand-300 animate-fade-in-up"
        style={{ animationDelay: "160ms" }}
      >
        <div className="h-px flex-1 bg-brand-100" />
        ou
        <div className="h-px flex-1 bg-brand-100" />
      </div>

      <button
        onClick={handleGoogleLogin}
        className="btn-secondary animate-fade-in-up"
        style={{ animationDelay: "160ms" }}
        disabled={loading}
      >
        <GoogleIcon /> Entrar com Google
      </button>

      <p className="mt-6 text-center text-sm text-brand-400 animate-fade-in-up" style={{ animationDelay: "240ms" }}>
        Ainda não tem conta?{" "}
        <Link to="/cadastro" className="font-bold text-brand-600">
          Criar conta de paciente
        </Link>
      </p>

      <button
        type="button"
        onClick={toggleDesktopMode}
        className="mt-8 text-center text-xs font-semibold text-brand-300 underline-offset-2 hover:text-brand-500 hover:underline animate-fade-in-up"
        style={{ animationDelay: "300ms" }}
      >
        {desktopMode ? "Usar versão para celular" : "💻 Usar versão para computador"}
      </button>
    </div>
  );
}
