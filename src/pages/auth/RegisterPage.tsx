import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerWithEmail } from "@/firebase/auth";
import { assumirCadastroPorCodigo } from "@/services/patients";
import { formatarCodigo, normalizarCodigo } from "@/utils/accessCode";

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [temCodigo, setTemCodigo] = useState(false);
  const [codigo, setCodigo] = useState("");
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

      // Depois de existir a conta: o código liga o cadastro que a profissional já
      // tinha feito. Falhar aqui não desfaz a conta — ela entra e tenta de novo
      // pelo perfil, em vez de perder o cadastro que acabou de criar.
      if (temCodigo && codigo.trim()) {
        const r = await assumirCadastroPorCodigo(normalizarCodigo(codigo));
        if (!r.ok) {
          setError(`${r.erro ?? "Não consegui usar o código."} Sua conta foi criada — você pode tentar o código depois, no seu perfil.`);
          setLoading(false);
          return;
        }
      }

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

        {/* A profissional cadastra primeiro e entrega o código; quem chega depois
            é a conta. Sem isso, o paciente importado apareceria em branco, sem
            nada do que já foi atendido. */}
        <button
          type="button"
          onClick={() => setTemCodigo(!temCodigo)}
          className="self-start text-xs font-bold text-brand-500"
        >
          {temCodigo ? "Não tenho código" : "Já tenho um código da minha profissional"}
        </button>

        {temCodigo && (
          <div>
            <input
              value={formatarCodigo(normalizarCodigo(codigo))}
              onChange={(e) => setCodigo(normalizarCodigo(e.target.value).slice(0, 6))}
              placeholder="ABC-123"
              autoCapitalize="characters"
              autoComplete="off"
              className="input-field text-center text-lg font-extrabold tracking-widest"
            />
            <p className="mt-1 text-xs leading-snug text-brand-400">
              São 6 letras e números que sua profissional te passou. Com ele, seus atendimentos já
              aparecem aqui desde o começo.
            </p>
          </div>
        )}

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
