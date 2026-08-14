import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { acharMaterial, type BlocoMaterial } from "@/data/materials";

/**
 * Material de psicoeducação aberto pelo link, sem login.
 *
 * Não passa pelo Firebase: o conteúdo é o mesmo para todo mundo e não tem nada
 * de ninguém dentro. O endereço é o assunto (/material/sono), então dá para
 * salvar nos favoritos e voltar às três da manhã, que é quando costuma ser
 * preciso.
 */
export function MaterialPage() {
  const { slug = "" } = useParams();
  const material = acharMaterial(slug);

  useEffect(() => {
    if (material) document.title = `${material.titulo} · ROTA`;
  }, [material]);

  if (!material) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-50 p-6">
        <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-card">
          <p className="text-lg font-extrabold text-brand-900">Material não encontrado</p>
          <p className="mt-2 text-sm text-brand-500">O endereço pode estar incompleto. Peça para reenviarem.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 pb-10">
      <div className="mx-auto max-w-md px-4 pt-8">
        <p className="text-4xl">{material.icone}</p>
        <h1 className="mt-2 text-2xl font-extrabold leading-tight text-brand-900">{material.titulo}</h1>
        <p className="mt-1 text-sm font-bold text-brand-400">{material.subtitulo}</p>

        <div className="mt-5 flex flex-col gap-4">
          {material.blocos.map((bloco, i) => (
            <Bloco key={i} bloco={bloco} />
          ))}

          <div className="rounded-2xl bg-brand-500 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-white/70">Lembre-se</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {material.lembre.map((l) => (
                <li key={l} className="text-sm font-bold leading-snug text-white">
                  {l}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-brand-300">
          Material de apoio, para o intervalo entre as sessões. Não substitui o acompanhamento — leve o que
          apareceu aqui para a sua próxima conversa.
          <br />
          <Link to="/" className="font-bold text-brand-400">
            ROTA
          </Link>
        </p>
      </div>
    </div>
  );
}

function Bloco({ bloco }: { bloco: BlocoMaterial }) {
  if (bloco.tipo === "texto") {
    return <p className="text-[15px] leading-relaxed text-brand-700">{bloco.texto}</p>;
  }

  if (bloco.tipo === "destaque") {
    return (
      <p className="rounded-2xl border-l-4 border-brand-400 bg-white p-4 text-[15px] font-bold leading-relaxed text-brand-800 shadow-card">
        {bloco.texto}
      </p>
    );
  }

  if (bloco.tipo === "lista") {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-card">
        {bloco.titulo && <p className="mb-2 text-sm font-extrabold text-brand-900">{bloco.titulo}</p>}
        <ul className="flex flex-col gap-2">
          {bloco.itens.map((i) => (
            <li key={i} className="flex gap-2 text-sm leading-snug text-brand-600">
              <span className="text-brand-300">•</span>
              <span>{i}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (bloco.tipo === "ciclo") {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-card">
        <p className="mb-3 text-sm font-extrabold text-brand-900">{bloco.titulo}</p>
        <div className="flex flex-col">
          {bloco.passos.map((p, i) => (
            <div key={p.titulo} className="flex gap-3">
              {/* A linha vertical faz o ciclo parecer ciclo: sem ela vira lista. */}
              <div className="flex flex-col items-center">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream-100 text-base">
                  {p.icone}
                </span>
                {i < bloco.passos.length - 1 && <span className="w-px flex-1 bg-brand-100" />}
              </div>
              <div className={i < bloco.passos.length - 1 ? "pb-4" : ""}>
                <p className="text-sm font-bold text-brand-800">{p.titulo}</p>
                <p className="mt-0.5 text-sm leading-snug text-brand-500">{p.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (bloco.tipo === "acoes") {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-card">
        <p className="mb-3 text-sm font-extrabold text-brand-900">{bloco.titulo}</p>
        <div className="flex flex-col gap-3">
          {bloco.itens.map((a) => (
            <div key={a.titulo} className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-base">
                {a.icone}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-brand-800">{a.titulo}</p>
                <p className="mt-0.5 text-sm leading-snug text-brand-500">{a.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-amber-50 p-4">
      <p className="text-sm font-extrabold text-amber-900">⚠️ {bloco.titulo}</p>
      <p className="mt-1 text-sm leading-relaxed text-amber-800">{bloco.texto}</p>
    </div>
  );
}
