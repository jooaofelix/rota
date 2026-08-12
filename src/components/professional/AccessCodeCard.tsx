import { useState } from "react";
import { useToast } from "@/contexts/ToastContext";
import { gerarCodigoDeAcesso } from "@/services/patients";
import type { PatientDoc } from "@/types";
import { formatarCodigo } from "@/utils/accessCode";
import { firstName } from "@/utils/proposals";

/**
 * O código que transforma o cadastro em conta.
 *
 * Só aparece para quem ainda não tem login. Depois que a pessoa usa, o código
 * some do cadastro — e o cartão some junto, porque não há mais nada a entregar.
 */
export function AccessCodeCard({ patient, patientName }: { patient: PatientDoc; patientName: string }) {
  const { showToast } = useToast();
  const [gerando, setGerando] = useState(false);
  const [codigo, setCodigo] = useState(patient.accessCode ?? "");

  if (patient.hasAccount) return null;

  const mensagem = [
    `Oi, ${firstName(patientName)}!`,
    "",
    "Uso um aplicativo para acompanhar a rotina entre as sessões. Se quiser usar também, é só criar sua conta e informar este código:",
    "",
    formatarCodigo(codigo),
    "",
    "Ele liga a conta ao seu acompanhamento, então já aparece tudo certo desde o começo.",
    "",
    "Sem obrigação nenhuma — se preferir não usar, seguimos igual.",
  ].join("\n");

  async function gerar() {
    setGerando(true);
    try {
      setCodigo(await gerarCodigoDeAcesso(patient.uid));
      showToast("Código gerado.");
    } catch {
      showToast("Não deu para gerar agora.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="card">
      <p className="text-sm font-bold text-brand-700">Convidar para o aplicativo</p>
      <p className="mt-0.5 text-xs leading-snug text-brand-400">
        Este cadastro é seu — {firstName(patientName)} ainda não tem conta. Com o código, ela cria a
        conta e o acompanhamento já aparece pronto, sem recomeçar do zero.
      </p>

      {codigo ? (
        <>
          <div className="mt-3 rounded-2xl bg-brand-50 py-3 text-center">
            <p className="text-2xl font-extrabold tracking-widest text-brand-800">
              {formatarCodigo(codigo)}
            </p>
          </div>

          <div className="mt-2 flex gap-2">
            <button
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(mensagem)}`, "_blank")}
              className="btn-secondary flex-1"
            >
              💬 Enviar
            </button>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(codigo);
                  showToast("Código copiado.");
                } catch {
                  showToast(codigo);
                }
              }}
              className="btn-secondary flex-1"
            >
              Copiar
            </button>
          </div>

          <p className="mt-2 text-[11px] leading-snug text-brand-400">
            Vale uma vez só. Depois que ela usar, o código some daqui.
          </p>
        </>
      ) : (
        <button onClick={gerar} disabled={gerando} className="btn-secondary mt-3">
          {gerando ? "Gerando..." : "Gerar código de acesso"}
        </button>
      )}
    </div>
  );
}
