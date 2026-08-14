import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import clsx from "clsx";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { TopBar } from "@/components/common/TopBar";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ANAMNESE, chave, totalDeCampos, type CampoAnamnese } from "@/data/anamneseModel";
import { adicionarAdendo, encerrarAnamnese, salvarAnamnese, subscribeToAnamnese } from "@/services/anamnese";
import { subscribeToPatient, subscribeToUser } from "@/services/patients";
import type { AnamneseDoc, PatientDoc, UserDoc } from "@/types";

const AnamnesePdfLink = lazy(() =>
  import("@/components/professional/AnamnesePdfLink").then((m) => ({ default: m.AnamnesePdfLink }))
);

/**
 * A anamnese do paciente.
 *
 * Página inteira, e não folha: ela é preenchida em duas ou três sessões, com o
 * paciente na frente, e uma folha que cobre metade da tela obriga a fechar e
 * reabrir a cada bloco.
 *
 * Salva sozinha. Anamnese perdida por causa de um toque errado é o tipo de
 * coisa que faz alguém voltar para o papel e nunca mais confiar no aplicativo.
 */
export function AnamnesePage() {
  const { patientId = "" } = useParams();
  const { firebaseUser, userDoc } = useAuth();
  const { showToast } = useToast();

  const [anamnese, setAnamnese] = useState<AnamneseDoc | null>(null);
  const [patient, setPatient] = useState<PatientDoc | null>(null);
  const [user, setUser] = useState<UserDoc | null>(null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [carregou, setCarregou] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvoEm, setSalvoEm] = useState<Date | null>(null);
  const [aberto, setAberto] = useState<string | null>("identificacao");
  const [confirmandoEncerrar, setConfirmandoEncerrar] = useState(false);
  const [adendo, setAdendo] = useState("");
  const timer = useRef<number>();

  useEffect(() => {
    const unsub = [
      subscribeToAnamnese(patientId, (a) => {
        setAnamnese(a);
        // Só na primeira chegada: depois disso quem manda no formulário é o que
        // está sendo digitado, senão cada gravação sobrescreve o campo em foco.
        setCarregou((jaCarregou) => {
          if (!jaCarregou) setRespostas(a?.respostas ?? {});
          return true;
        });
      }),
      subscribeToPatient(patientId, setPatient),
      subscribeToUser(patientId, setUser),
    ];
    return () => unsub.forEach((u) => u());
  }, [patientId]);

  const nome = user?.name ?? patient?.name;
  const encerrada = !!anamnese?.signedAt;

  const preenchidos = useMemo(
    () => Object.values(respostas).filter((v) => v && v.trim().length > 0).length,
    [respostas]
  );

  function editar(campoId: string, valor: string) {
    if (encerrada) return;
    const novas = { ...respostas, [campoId]: valor };
    setRespostas(novas);
    // Um segundo e meio parado: grava. Segurar mais perde trabalho, gravar a
    // cada tecla enche o Firestore de escrita por nada.
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => gravar(novas), 1500);
  }

  async function gravar(novas: Record<string, string>) {
    if (!firebaseUser) return;
    setSalvando(true);
    try {
      await salvarAnamnese(patientId, firebaseUser.uid, novas);
      setSalvoEm(new Date());
    } catch {
      showToast("Não consegui salvar agora. O que você digitou continua na tela.", "error");
    } finally {
      setSalvando(false);
    }
  }

  if (!nome || !firebaseUser) return <LoadingSpinner label="Carregando anamnese..." />;

  return (
    <div>
      <TopBar
        title="Anamnese"
        subtitle={nome}
        back
        action={
          <span className="text-[11px] font-bold text-brand-400">
            {salvando ? "salvando..." : salvoEm ? `salvo ${salvoEm.toLocaleTimeString("pt-BR").slice(0, 5)}` : ""}
          </span>
        }
      />

      <div className="px-4 pb-6">
        <div className="card">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-brand-800">
              {encerrada ? "Anamnese encerrada" : "Em preenchimento"}
            </p>
            <p className="text-[11px] font-bold text-brand-400">
              {preenchidos} de {totalDeCampos()} campos
            </p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream-200">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${(preenchidos / totalDeCampos()) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] leading-snug text-brand-400">
            {encerrada
              ? `Encerrada em ${anamnese?.signedAt?.toDate?.().toLocaleDateString("pt-BR")}. A partir daqui o documento não muda — o que houver de novo entra como adendo.`
              : "Campo vazio não aparece no PDF. Preencha o que fizer sentido para este caso, no ritmo das sessões."}
          </p>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {ANAMNESE.map((bloco) => {
            const abertoAgora = aberto === bloco.id;
            const doBloco = bloco.campos.filter((c) => (respostas[chave(bloco.id, c.id)] ?? "").trim()).length;
            return (
              <div
                key={bloco.id}
                className={clsx("card", bloco.risco && "border-2 border-rose-100")}
              >
                <button
                  onClick={() => setAberto(abertoAgora ? null : bloco.id)}
                  className="flex w-full items-center gap-2.5 text-left"
                >
                  <span className="text-xl">{bloco.icone}</span>
                  <span className="min-w-0 flex-1">
                    <span className={clsx("block text-sm font-bold", bloco.risco ? "text-rose-700" : "text-brand-800")}>
                      {bloco.titulo}
                    </span>
                    <span className="text-[11px] text-brand-400">
                      {doBloco} de {bloco.campos.length} preenchidos
                    </span>
                  </span>
                  <span className="shrink-0 text-brand-300">{abertoAgora ? "▴" : "▾"}</span>
                </button>

                {abertoAgora && (
                  <div className="mt-3 flex flex-col gap-3">
                    {bloco.proposito && (
                      <p
                        className={clsx(
                          "rounded-xl p-2.5 text-[11px] leading-snug",
                          bloco.risco ? "bg-rose-50 text-rose-700" : "bg-cream-50 text-brand-500"
                        )}
                      >
                        {bloco.proposito}
                      </p>
                    )}
                    {bloco.campos.map((campo) => (
                      <Campo
                        key={campo.id}
                        campo={campo}
                        valor={respostas[chave(bloco.id, campo.id)] ?? ""}
                        somenteLeitura={encerrada}
                        onChange={(v) => editar(chave(bloco.id, campo.id), v)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {encerrada && (
          <div className="card mt-3">
            <p className="text-sm font-bold text-brand-800">Adendos</p>
            {anamnese?.addenda?.map((a, i) => (
              <p key={i} className="mt-2 rounded-xl bg-cream-50 p-2.5 text-xs leading-relaxed text-brand-600">
                {a.texto}
                <span className="mt-1 block text-[10px] text-brand-400">
                  registrado em {a.createdAt?.toDate?.().toLocaleDateString("pt-BR")}
                </span>
              </p>
            ))}
            <textarea
              value={adendo}
              onChange={(e) => setAdendo(e.target.value)}
              rows={3}
              className="input-field mt-2 resize-none"
              placeholder="O que apareceu depois e precisa constar."
            />
            <button
              onClick={async () => {
                if (!adendo.trim()) return;
                await adicionarAdendo(patientId, adendo);
                setAdendo("");
                showToast("Adendo registrado.");
              }}
              disabled={!adendo.trim()}
              className="btn-secondary mt-2"
            >
              Acrescentar adendo
            </button>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {anamnese && (
            <Suspense fallback={<div className="btn-secondary text-center">Preparando PDF...</div>}>
              <AnamnesePdfLink
                anamnese={{ ...anamnese, respostas }}
                patientName={nome}
                professionalName={userDoc?.name ?? ""}
                fileName={`anamnese-${nome.toLowerCase().replace(/\s+/g, "-")}.pdf`}
              />
            </Suspense>
          )}
          {!encerrada && anamnese && (
            <button onClick={() => setConfirmandoEncerrar(true)} className="text-sm font-bold text-brand-400">
              Encerrar anamnese
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmandoEncerrar}
        title="Encerrar a anamnese?"
        description="Depois de encerrada ela não muda mais — o que vier de novo entra como adendo, preservando o que já estava escrito. É assim que a Resolução CFP 001/2009 trata documento de prontuário."
        confirmLabel="Encerrar"
        onCancel={() => setConfirmandoEncerrar(false)}
        onConfirm={async () => {
          setConfirmandoEncerrar(false);
          try {
            await gravar(respostas);
            await encerrarAnamnese(patientId);
            showToast("Anamnese encerrada.");
          } catch {
            showToast("Não consegui encerrar agora. Tente de novo.", "error");
          }
        }}
      />
    </div>
  );
}

function Campo({
  campo,
  valor,
  somenteLeitura,
  onChange,
}: {
  campo: CampoAnamnese;
  valor: string;
  somenteLeitura: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-bold text-brand-700">{campo.rotulo}</span>

      {campo.tipo === "escolha" ? (
        <div className="flex flex-wrap gap-1.5">
          {campo.opcoes?.map((o) => (
            <button
              key={o}
              type="button"
              disabled={somenteLeitura}
              onClick={() => onChange(valor === o ? "" : o)}
              className={clsx(
                "rounded-full px-3 py-1.5 text-xs font-bold",
                valor === o ? "bg-brand-500 text-white" : "bg-cream-100 text-brand-600"
              )}
            >
              {o}
            </button>
          ))}
        </div>
      ) : campo.tipo === "longo" ? (
        <textarea
          value={valor}
          readOnly={somenteLeitura}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={campo.dica}
          className="input-field resize-none text-sm"
        />
      ) : (
        <input
          value={valor}
          readOnly={somenteLeitura}
          type={campo.tipo === "data" ? "date" : "text"}
          onChange={(e) => onChange(e.target.value)}
          placeholder={campo.dica}
          className="input-field text-sm"
        />
      )}

      {campo.dica && campo.tipo === "escolha" && (
        <span className="text-[11px] leading-snug text-brand-400">{campo.dica}</span>
      )}
    </label>
  );
}
