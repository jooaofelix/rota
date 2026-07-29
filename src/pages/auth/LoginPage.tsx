import { useEffect, useState, useRef } from "react";
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

const ROTATING_WORDS = ["direção", "acompanhamento", "crescimento", "progresso"];

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      opacity: number;
    }> = [];

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2,
      });
    }

    let animationFrameId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.fillStyle = `rgba(47, 154, 124, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wordIndex, setWordIndex] = useState(0);
  const { desktopMode, toggleDesktopMode } = useDesktopMode();

  useEffect(() => {
    completeGoogleRedirectSignIn().catch((err) => {
      setError(`Não foi possível entrar com o Google. (${err?.code ?? err?.message ?? "erro desconhecido"})`);
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
    }, 5000);
    return () => clearInterval(interval);
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
      await loginWithGoogle();
    } catch (err: any) {
      setError(`Não foi possível entrar com o Google. (${err?.code ?? err?.message ?? "erro desconhecido"})`);
      setLoading(false);
    }
  }

  return (
    <div className="relative w-full min-h-screen bg-gradient-to-br from-brand-50 via-cream-50 to-brand-100 overflow-hidden">
      <ParticleCanvas />

      <div className="relative z-10 flex flex-col min-h-screen px-4 pt-8 pb-6 sm:px-6">
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Logo */}
          <div className="mb-8 sm:mb-12">
            <img
              src="/logo-icon.png"
              alt="ROTA"
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl shadow-lg"
            />
          </div>

          {/* Heading and rotating word */}
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-2">
              <span className="bg-gradient-to-r from-brand-700 to-brand-500 bg-clip-text text-transparent">
                ROTA
              </span>
            </h1>
            <p className="text-sm sm:text-base text-brand-600 font-medium">
              Sua{" "}
              <span className="inline-block min-w-32 text-center font-bold text-brand-700">
                <span
                  key={wordIndex}
                  className="inline-block animate-word-rotate"
                >
                  {ROTATING_WORDS[wordIndex]}
                </span>
              </span>
              , um passo de cada vez.
            </p>
          </div>

          {/* Firebase warning */}
          {!isFirebaseConfigured && (
            <div className="w-full max-w-sm mb-6 rounded-xl bg-amber-100 p-3 text-xs font-semibold text-amber-800">
              O Firebase ainda não foi configurado neste ambiente. Preencha o arquivo .env com as chaves do seu projeto.
            </div>
          )}

          {/* Form Container */}
          <div className="w-full max-w-sm space-y-4">
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
              <Link to="/esqueci-senha" className="self-end text-sm font-bold text-brand-500 hover:text-brand-600">
                Esqueci minha senha
              </Link>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>

            <div className="flex items-center gap-3 text-xs font-semibold text-brand-300">
              <div className="h-px flex-1 bg-brand-100" />
              ou
              <div className="h-px flex-1 bg-brand-100" />
            </div>

            <button onClick={handleGoogleLogin} className="btn-secondary" disabled={loading}>
              <GoogleIcon /> Entrar com Google
            </button>

            <p className="text-center text-sm text-brand-600">
              Ainda não tem conta?{" "}
              <Link to="/cadastro" className="font-bold text-brand-700 hover:text-brand-800">
                Criar conta de paciente
              </Link>
            </p>
          </div>
        </div>

        {/* Desktop mode toggle at bottom */}
        <button
          type="button"
          onClick={toggleDesktopMode}
          className="self-center text-xs font-semibold text-brand-400 hover:text-brand-500 underline-offset-2 hover:underline"
        >
          {desktopMode ? "Usar versão para celular" : "💻 Usar versão para computador"}
        </button>
      </div>
    </div>
  );
}
