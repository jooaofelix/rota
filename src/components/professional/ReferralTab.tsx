import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { recordReferral, removeReferral, subscribeToPatientReferrals } from "@/services/referrals";
import type { ReferralDoc } from "@/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { todayKey } from "@/utils/date";
import {
  REFERRAL_TEMPLATES,
  buildReferralMessage,
  initialsOf,
  type ReferralFormat,
  type ReferralTemplate,
} from "@/utils/referrals";

/**
 * Encaminhar o paciente para outro profissional.
 *
 * A dificuldade nunca foi decidir encaminhar — é escrever a mensagem. Ela trava
 * entre dizer de menos (o colega não entende o pedido) e dizer de mais (vaza o
 * que foi dito em sessão). Os modelos resolvem essa linha: dizem o que o colega
 * precisa para decidir se atende e por onde começar, e param aí.
 */
export function ReferralTab({ patientId, patientName }: { patientId: string; patientName: string }) {
  const { firebaseUser, userDoc } = useAuth();
  const { showToast } = useToast();
  const [historico, setHistorico] = useState<ReferralDoc[]>([]);
  const [escolhido, setEscolhido] = useState<ReferralTemplate | null>(null);
  const [apagando, setApagando] = useState<ReferralDoc | null>(null);

  useEffect(() => subscribeToPatientReferrals(patientId, setHistorico), [patientId]);

  if (escolhido) {
    return (
      <ReferralComposer
        template={escolhido}
        patientId={patientId}
        patientName={patientName}
        professionalId={firebaseUser?.uid ?? ""}
        professionalName={userDoc?.name ?? "Profissional"}
        onBack={() => setEscolhido(null)}
      />
    );
  }

  const paraColega = REFERRAL_TEMPLATES.filter((t) => t.audiencia === "colega");
  const paraPaciente = REFERRAL_TEMPLATES.filter((t) => t.audiencia === "paciente");

  return (
    <div className="flex flex-col gap-4">
      {historico.length > 0 && (
        <div className="card">
          <p className="mb-2 text-sm font-bold text-brand-700">Já encaminhada para</p>
          <div className="flex flex-col">
            {historico.map((r) => (
              <div key={r.id} className="flex items-start gap-2.5 border-b border-brand-50 py-2 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-brand-800">
                    {r.especialidade}
                    {r.colleagueName ? ` · ${r.colleagueName}` : ""}
                  </p>
                  {r.motivo && <p className="truncate text-xs text-brand-400">{r.motivo}</p>}
                </div>
                {r.urgente && (
                  <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600">
                    prioridade
                  </span>
                )}
                <button onClick={() => setApagando(r)} className="shrink-0 text-[11px] font-bold text-brand-300">
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <p className="text-sm font-bold text-brand-700">Mensagem para outro profissional</p>
        <p className="mb-2 text-xs leading-snug text-brand-400">
          Cada modelo diz o necessário para o colega decidir se atende e por onde começar — e para
          por aí. O que foi dito em sessão continua na sessão.
        </p>
        <div className="flex flex-col gap-1.5">
          {paraColega.map((t) => (
            <Modelo key={t.id} template={t} onClick={() => setEscolhido(t)} />
          ))}
        </div>
      </div>

      <div className="card">
        <p className="mb-2 text-sm font-bold text-brand-700">Mensagem para o paciente</p>
        <div className="flex flex-col gap-1.5">
          {paraPaciente.map((t) => (
            <Modelo key={t.id} template={t} onClick={() => setEscolhido(t)} />
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={!!apagando}
        title="Apagar este registro?"
        description="Some apenas o registro de que houve o encaminhamento. A mensagem enviada não é afetada."
        confirmLabel="Apagar"
        danger
        onConfirm={async () => {
          if (apagando) await removeReferral(apagando.id);
          setApagando(null);
          showToast("Registro apagado.");
        }}
        onCancel={() => setApagando(null)}
      />
    </div>
  );
}

function Modelo({ template, onClick }: { template: ReferralTemplate; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-2xl border-2 border-brand-100 p-3 text-left">
      <p className="text-sm font-bold text-brand-800">
        {template.icone} {template.especialidade}
      </p>
      <p className="mt-0.5 text-xs leading-snug text-brand-500">{template.quando}</p>
    </button>
  );
}

function ReferralComposer({
  template,
  patientId,
  patientName,
  professionalId,
  professionalName,
  onBack,
}: {
  template: ReferralTemplate;
  patientId: string;
  patientName: string;
  professionalId: string;
  professionalName: string;
  onBack: () => void;
}) {
  const { showToast } = useToast();
  const paraColega = template.audiencia === "colega";

  const [colleagueName, setColleagueName] = useState("");
  const [colleagueContact, setColleagueContact] = useState("");
  const [motivo, setMotivo] = useState(template.motivoSugerido ?? "");
  const [observado, setObservado] = useState("");
  const [registro, setRegistro] = useState("");
  const [consentimento, setConsentimento] = useState(true);
  const [urgente, setUrgente] = useState(false);
  // Consulta de vaga não precisa identificar ninguém — só as iniciais bastam.
  const [identificar, setIdentificar] = useState(template.id !== "vaga");
  const [formato, setFormato] = useState<ReferralFormat>("curta");
  const [registrado, setRegistrado] = useState(false);

  const mensagem = useMemo(
    () =>
      buildReferralMessage(
        template,
        {
          patientLabel: identificar || !paraColega ? patientName : initialsOf(patientName),
          professionalName,
          professionalRegistro: registro.trim() || undefined,
          colleagueName: colleagueName.trim() || undefined,
          motivo: motivo.trim() || undefined,
          observado: observado.trim() || undefined,
          consentimento,
          urgente,
          hoje: todayKey(),
        },
        formato
      ),
    [template, identificar, paraColega, patientName, professionalName, registro, colleagueName, motivo, observado, consentimento, urgente, formato]
  );

  /** Registra uma vez por composição: é o histórico do acompanhamento, não um contador de envios. */
  async function anotar() {
    if (registrado || !paraColega) return;
    try {
      await recordReferral({
        professionalId,
        patientId,
        patientName,
        especialidade: template.especialidade,
        colleagueName: colleagueName.trim() || undefined,
        motivo: motivo.trim() || undefined,
        urgente,
      });
      setRegistrado(true);
    } catch {
      // Sem registro o encaminhamento ainda acontece — só não entra no histórico.
    }
  }

  async function porWhatsapp() {
    await anotar();
    const numero = colleagueContact.replace(/\D/g, "");
    const base = numero.length >= 10 ? `https://wa.me/${numero.length <= 11 ? "55" + numero : numero}` : "https://wa.me/";
    window.open(`${base}?text=${encodeURIComponent(mensagem)}`, "_blank");
  }

  async function porEmail() {
    await anotar();
    const assunto = paraColega ? `Encaminhamento — ${template.especialidade}` : "Uma sugestão para o seu acompanhamento";
    const destino = colleagueContact.includes("@") ? colleagueContact.trim() : "";
    window.location.href = `mailto:${destino}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(mensagem)}`;
  }

  async function copiar() {
    await anotar();
    try {
      await navigator.clipboard.writeText(mensagem);
      showToast("Mensagem copiada.");
    } catch {
      showToast("Não deu para copiar. Selecione o texto acima.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="self-start text-sm font-bold text-brand-500">
        ‹ Outros modelos
      </button>

      <div className="card">
        <p className="text-sm font-bold text-brand-800">
          {template.icone} {template.especialidade}
        </p>
        <p className="mt-0.5 text-xs leading-snug text-brand-400">{template.quando}</p>
      </div>

      <div className="card flex flex-col gap-3">
        {paraColega && (
          <>
            <div>
              <p className="mb-1 text-xs font-bold text-brand-500">Nome do colega (opcional)</p>
              <input
                value={colleagueName}
                onChange={(e) => setColleagueName(e.target.value)}
                placeholder="Dr. Rafael Lima"
                className="input-field"
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-bold text-brand-500">WhatsApp ou e-mail (opcional)</p>
              <input
                value={colleagueContact}
                onChange={(e) => setColleagueContact(e.target.value)}
                placeholder="(11) 98888-7777 ou rafael@exemplo.com"
                className="input-field"
              />
            </div>
          </>
        )}

        <div>
          <p className="mb-1 text-xs font-bold text-brand-500">
            {paraColega ? "Motivo do encaminhamento" : "Para qual profissional"}
          </p>
          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder={paraColega ? "avaliação psiquiátrica" : "um psiquiatra"}
            className="input-field"
          />
        </div>

        {paraColega && (
          <div>
            <p className="mb-1 text-xs font-bold text-brand-500">O que sustenta o pedido (opcional)</p>
            <textarea
              value={observado}
              onChange={(e) => setObservado(e.target.value)}
              rows={3}
              placeholder="Só o necessário para o colega entender o pedido."
              className="input-field resize-none text-sm"
            />
            <p className="mt-1 text-[11px] leading-snug text-brand-400">
              Escreva o que ajuda a decidir a conduta. Conteúdo de sessão não precisa entrar aqui —
              se o colega precisar de mais, ele pede.
            </p>
          </div>
        )}

        {paraColega && (
          <div>
            <p className="mb-1 text-xs font-bold text-brand-500">Seu registro (opcional)</p>
            <input
              value={registro}
              onChange={(e) => setRegistro(e.target.value)}
              placeholder="CRP 00/00000"
              className="input-field"
            />
          </div>
        )}

        {paraColega && (
          <div className="flex flex-col gap-2 rounded-2xl bg-cream-100 p-3">
            <Marcador
              ativo={consentimento}
              onToggle={() => setConsentimento(!consentimento)}
              titulo="A pessoa concordou com o encaminhamento"
              detalhe="A mensagem diz isso ao colega. Sem o acordo dela, o compartilhamento não deveria sair."
            />
            <Marcador
              ativo={identificar}
              onToggle={() => setIdentificar(!identificar)}
              titulo="Identificar pelo nome"
              detalhe={
                identificar
                  ? `Vai como "${patientName}".`
                  : `Vai como "${initialsOf(patientName)}" — bom para só consultar vaga.`
              }
            />
            <Marcador
              ativo={urgente}
              onToggle={() => setUrgente(!urgente)}
              titulo="Marcar como prioridade"
              detalhe="Acrescenta uma linha no começo pedindo prioridade na agenda."
            />
          </div>
        )}

        {paraColega && (
          <div className="flex gap-2">
            {(
              [
                ["curta", "Mensagem"],
                ["carta", "Carta formal"],
              ] as Array<[ReferralFormat, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFormato(key)}
                className={clsx(
                  "flex-1 rounded-xl px-3 py-2 text-sm font-bold",
                  formato === key ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-600"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <p className="mb-1 text-sm font-bold text-brand-700">Como vai sair</p>
        <pre className="whitespace-pre-wrap rounded-2xl bg-brand-50/70 p-3 font-sans text-xs leading-relaxed text-brand-700">
          {mensagem}
        </pre>
      </div>

      <div className="flex flex-col gap-2">
        <button onClick={porWhatsapp} className="btn-primary">
          💬 Enviar pelo WhatsApp
        </button>
        <div className="flex gap-2">
          <button onClick={porEmail} className="btn-secondary flex-1">
            ✉️ E-mail
          </button>
          <button onClick={copiar} className="btn-secondary flex-1">
            📋 Copiar
          </button>
        </div>
        {registrado && (
          <p className="text-center text-xs font-bold text-emerald-600">
            ✓ Encaminhamento anotado no histórico do paciente.
          </p>
        )}
      </div>
    </div>
  );
}

function Marcador({
  ativo,
  onToggle,
  titulo,
  detalhe,
}: {
  ativo: boolean;
  onToggle: () => void;
  titulo: string;
  detalhe: string;
}) {
  return (
    <button onClick={onToggle} className="flex items-start gap-2.5 text-left">
      <span
        className={clsx(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-[11px] font-bold",
          ativo ? "border-brand-500 bg-brand-500 text-white" : "border-brand-200"
        )}
      >
        {ativo ? "✓" : ""}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold text-brand-700">{titulo}</span>
        <span className="block text-[11px] leading-snug text-brand-400">{detalhe}</span>
      </span>
    </button>
  );
}
