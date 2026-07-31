import { Suspense, lazy, useEffect, useState } from "react";
import clsx from "clsx";
import { BottomSheet } from "@/components/common/BottomSheet";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { addAddendum, getRecordForSession, saveRecord, signRecord } from "@/services/sessions";
import type { SessionDoc, SessionRecordDoc } from "@/types";
import { formatShortDate } from "@/utils/date";

// Carregado sob demanda: puxa o @react-pdf/renderer, pesado demais para o bundle inicial.
const RecordPdfLink = lazy(() =>
  import("./RecordPdfLink").then((m) => ({ default: m.RecordPdfLink }))
);

const CAMPOS = [
  { key: "complaint", label: "Demanda do dia", placeholder: "O que o paciente trouxe hoje.", rows: 2 },
  { key: "evolution", label: "Evolução", placeholder: "O que aconteceu na sessão. É o campo que sustenta o registro.", rows: 5 },
  { key: "interventions", label: "Procedimentos e técnicas", placeholder: "Recursos utilizados no atendimento.", rows: 2 },
  { key: "patientState", label: "Estado e apresentação", placeholder: "Humor, postura, contato durante a sessão.", rows: 2 },
  { key: "plan", label: "Plano para o próximo encontro", placeholder: "Por onde seguir.", rows: 2 },
  { key: "homework", label: "Combinado com o paciente", placeholder: "Tarefa ou acordo levado para casa.", rows: 2 },
  { key: "referral", label: "Encaminhamentos", placeholder: "Psiquiatria, exames, rede de apoio.", rows: 2 },
] as const;

type CampoKey = (typeof CAMPOS)[number]["key"];
type Form = Record<CampoKey, string> & { riskFlag: boolean; riskNote: string };

const EMPTY: Form = {
  complaint: "", evolution: "", interventions: "", patientState: "",
  plan: "", homework: "", referral: "", riskFlag: false, riskNote: "",
};

export function SessionRecordSheet({
  session,
  onClose,
  onBack,
}: {
  session: SessionDoc;
  onClose: () => void;
  onBack: () => void;
}) {
  const { firebaseUser, userDoc } = useAuth();
  const { showToast } = useToast();
  const [record, setRecord] = useState<SessionRecordDoc | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmingSign, setConfirmingSign] = useState(false);
  const [addendum, setAddendum] = useState("");

  useEffect(() => {
    getRecordForSession(session.id)
      .then((found) => {
        setRecord(found);
        if (found) {
          setForm({
            complaint: found.complaint ?? "",
            evolution: found.evolution ?? "",
            interventions: found.interventions ?? "",
            patientState: found.patientState ?? "",
            plan: found.plan ?? "",
            homework: found.homework ?? "",
            referral: found.referral ?? "",
            riskFlag: found.riskFlag,
            riskNote: found.riskNote ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, [session.id]);

  const signed = !!record?.signedAt;

  async function handleSave() {
    if (!firebaseUser || !form.evolution.trim()) return;
    setSaving(true);
    try {
      const id = await saveRecord(record?.id ?? null, {
        sessionId: session.id,
        patientId: session.patientId,
        professionalId: firebaseUser.uid,
        date: session.date,
        complaint: form.complaint.trim(),
        evolution: form.evolution.trim(),
        interventions: form.interventions.trim(),
        patientState: form.patientState.trim(),
        plan: form.plan.trim(),
        homework: form.homework.trim(),
        referral: form.referral.trim(),
        riskFlag: form.riskFlag,
        riskNote: form.riskNote.trim(),
      });
      setRecord((prev) => ({ ...(prev ?? ({} as SessionRecordDoc)), id, ...form } as SessionRecordDoc));
      showToast("Registro salvo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSign() {
    if (!record) return;
    await signRecord(record.id);
    setRecord({ ...record, signedAt: { toDate: () => new Date() } as never });
    setConfirmingSign(false);
    showToast("Registro encerrado.");
  }

  async function handleAddendum() {
    if (!record || !addendum.trim()) return;
    await addAddendum(record, addendum.trim());
    setRecord({
      ...record,
      addenda: [...(record.addenda ?? []), { text: addendum.trim(), createdAt: { toDate: () => new Date() } as never }],
    });
    setAddendum("");
    showToast("Adendo acrescentado.");
  }

  return (
    <BottomSheet
      open
      onClose={onClose}
      title="Registro da sessão"
      footer={
        loading ? undefined : signed ? (
          <button onClick={onBack} className="btn-secondary">
            Voltar
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <button className="btn-primary" onClick={handleSave} disabled={saving || !form.evolution.trim()}>
              {saving ? "Salvando..." : "Salvar registro"}
            </button>
            <div className="flex gap-2">
              <button onClick={onBack} className="btn-secondary flex-1">
                Voltar
              </button>
              {record && (
                <button className="btn-secondary flex-1" onClick={() => setConfirmingSign(true)}>
                  Encerrar registro
                </button>
              )}
            </div>
          </div>
        )
      }
    >
      <p className="mb-3 text-sm text-brand-500">
        <span className="font-bold text-brand-700">{session.patientName}</span> ·{" "}
        {formatShortDate(session.date)} · {session.startTime}
      </p>

      {loading ? (
        <p className="py-6 text-center text-sm text-brand-400">Carregando registro...</p>
      ) : (
        <div className="flex flex-col gap-3">
          {signed && (
            <div className="rounded-xl bg-cream-100 p-3 text-xs leading-snug text-brand-600">
              Este registro foi encerrado e não pode mais ser alterado. Correções ou complementos
              entram como <span className="font-bold">adendo</span>, preservando o que já estava escrito.
            </div>
          )}

          {CAMPOS.map(({ key, label, placeholder, rows }) => (
            <div key={key}>
              <p className="mb-1 text-xs font-bold text-brand-500">
                {label}
                {key === "evolution" && <span className="text-rose-500"> *</span>}
              </p>
              <textarea
                value={form[key]}
                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                rows={rows}
                placeholder={placeholder}
                disabled={signed}
                className="input-field resize-none text-sm disabled:bg-brand-50/60 disabled:text-brand-600"
              />
            </div>
          ))}

          <div className={clsx("rounded-xl p-3", form.riskFlag ? "bg-rose-50" : "bg-brand-50/60")}>
            <label className="flex items-center justify-between gap-2 text-sm font-bold text-brand-700">
              Sinalizar atenção a risco
              <input
                type="checkbox"
                checked={form.riskFlag}
                onChange={(e) => setForm((p) => ({ ...p, riskFlag: e.target.checked }))}
                disabled={signed}
                className="h-5 w-5 shrink-0 rounded border-brand-300"
              />
            </label>
            {form.riskFlag && (
              <textarea
                value={form.riskNote}
                onChange={(e) => setForm((p) => ({ ...p, riskNote: e.target.value }))}
                rows={2}
                placeholder="Descreva o que foi observado e a conduta adotada."
                disabled={signed}
                className="input-field mt-2 resize-none text-sm"
              />
            )}
          </div>

          {record?.addenda?.map((a, i) => (
            <div key={i} className="rounded-xl border-l-4 border-brand-200 bg-white p-3 text-sm text-brand-600">
              <p className="mb-1 text-xs font-bold text-brand-400">Adendo</p>
              {a.text}
            </div>
          ))}

          {signed ? (
            <div>
              <p className="mb-1 text-xs font-bold text-brand-500">Acrescentar adendo</p>
              <textarea
                value={addendum}
                onChange={(e) => setAddendum(e.target.value)}
                rows={2}
                placeholder="Complemento ou correção, com a data de hoje."
                className="input-field resize-none text-sm"
              />
              <button onClick={handleAddendum} disabled={!addendum.trim()} className="btn-secondary mt-2">
                Adicionar adendo
              </button>
            </div>
          ) : null}

          {record && (
            <Suspense fallback={<p className="text-center text-xs text-brand-400">Preparando PDF...</p>}>
              <RecordPdfLink
                patientName={session.patientName}
                professionalName={userDoc?.name ?? "Profissional"}
                records={[{ ...record, ...form, date: session.date } as SessionRecordDoc]}
                fileName={`registro-${session.patientName.toLowerCase().replace(/\s+/g, "-")}-${session.date}.pdf`}
              />
            </Suspense>
          )}

        </div>
      )}

      <ConfirmDialog
        open={confirmingSign}
        title="Encerrar este registro?"
        description="Depois de encerrado, o conteúdo não pode mais ser alterado — só complementado por adendo. É assim que um registro clínico deve se comportar."
        confirmLabel="Encerrar"
        onConfirm={handleSign}
        onCancel={() => setConfirmingSign(false)}
      />
    </BottomSheet>
  );
}
