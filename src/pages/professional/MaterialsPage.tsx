import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MATERIAIS, type Material } from "@/data/materials";
import { TopBar } from "@/components/common/TopBar";
import { useToast } from "@/contexts/ToastContext";

function linkDoMaterial(slug: string) {
  return `${window.location.origin}/material/${slug}`;
}

/**
 * Biblioteca de materiais para mandar ao paciente.
 *
 * Cada material tem endereço fixo e público, então mandar é só mandar um link —
 * não gera documento, não precisa de conta do outro lado e não expira. O mesmo
 * link serve para os oitenta pacientes.
 */
export function MaterialsPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return MATERIAIS;
    return MATERIAIS.filter((m) =>
      [m.titulo, m.subtitulo, m.resumo, m.quando].join(" ").toLowerCase().includes(t)
    );
  }, [busca]);

  function enviar(m: Material) {
    const texto = `Separei um material sobre isso que conversamos. Dá para ler com calma: ${linkDoMaterial(m.slug)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  }

  async function copiar(m: Material) {
    await navigator.clipboard.writeText(linkDoMaterial(m.slug));
    showToast("Link copiado.");
  }

  return (
    <div>
      <TopBar title="Materiais" subtitle="Para mandar entre uma sessão e outra" back />

      <div className="px-4 pb-4">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por assunto..."
          className="input-field"
        />

        <p className="mt-3 rounded-2xl bg-cream-100 p-3 text-xs leading-relaxed text-brand-600">
          O link é público e permanente — o mesmo para todo mundo, sem login e sem prazo. Nada do paciente
          entra no material, então mandar no WhatsApp não expõe ninguém.
        </p>

        <div className="mt-3 flex flex-col gap-2">
          {filtrados.map((m) => (
            <div key={m.slug} className="card">
              <button onClick={() => navigate(`/material/${m.slug}`)} className="flex w-full gap-3 text-left">
                <span className="text-2xl">{m.icone}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-brand-800">{m.titulo}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-brand-500">{m.resumo}</span>
                </span>
              </button>

              <p className="mt-2 rounded-xl bg-cream-50 p-2 text-[11px] leading-snug text-brand-400">
                <span className="font-bold">Quando usar:</span> {m.quando}
              </p>

              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => enviar(m)}
                  className="flex-1 rounded-xl bg-brand-500 px-3 py-2 text-xs font-bold text-white"
                >
                  Enviar no WhatsApp
                </button>
                <button
                  onClick={() => copiar(m)}
                  className="rounded-xl bg-cream-100 px-3 py-2 text-xs font-bold text-brand-600"
                >
                  Copiar link
                </button>
              </div>
            </div>
          ))}
        </div>

        {filtrados.length === 0 && (
          <p className="mt-6 text-center text-sm text-brand-400">Nenhum material com esse termo.</p>
        )}
      </div>
    </div>
  );
}
