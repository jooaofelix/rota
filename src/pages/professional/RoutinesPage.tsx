import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToLinkedPatients } from "@/services/patients";
import { subscribeToTemplates, applyTemplateToPatient, saveTemplate } from "@/services/templates";
import type { ProfessionalPatientLink, RoutineTemplateDoc } from "@/types";
import { TopBar } from "@/components/common/TopBar";
import { BottomSheet } from "@/components/common/BottomSheet";
import { TemplatePreview } from "@/components/common/TemplatePreview";
import { useToast } from "@/contexts/ToastContext";
import { getPatientsOverview, type PatientOverview } from "@/services/professionalOverview";
import { ICON_OPTIONS } from "@/utils/constants";
import clsx from "clsx";

export function RoutinesPage() {
  const { firebaseUser } = useAuth();
  const { showToast } = useToast();
  const [links, setLinks] = useState<ProfessionalPatientLink[]>([]);
  const [patients, setPatients] = useState<PatientOverview[]>([]);
  const [templates, setTemplates] = useState<RoutineTemplateDoc[]>([]);
  /** Modelo aberto na prévia, ainda sem paciente escolhido. */
  const [previewTemplate, setPreviewTemplate] = useState<RoutineTemplateDoc | null>(null);
  /** Modelo já revisado (com as prioridades organizadas), esperando o paciente. */
  const [selectedTemplate, setSelectedTemplate] = useState<RoutineTemplateDoc | null>(null);
  const [applying, setApplying] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  useEffect(() => {
    if (!firebaseUser) return;
    const unsub = [
      subscribeToLinkedPatients(firebaseUser.uid, setLinks),
      subscribeToTemplates(firebaseUser.uid, setTemplates),
    ];
    return () => unsub.forEach((u) => u());
  }, [firebaseUser]);

  useEffect(() => {
    if (links.length === 0) {
      setPatients([]);
      return;
    }
    getPatientsOverview(links.map((l) => l.patientId)).then(setPatients);
  }, [links]);

  async function handleApply(patientId: string) {
    if (!selectedTemplate || !firebaseUser) return;
    setApplying(true);
    try {
      await applyTemplateToPatient(selectedTemplate, patientId, firebaseUser.uid);
      showToast("Modelo aplicado ao paciente!");
      setSelectedTemplate(null);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div>
      <TopBar
        title="Modelos de rotina"
        subtitle="Aplique um modelo pronto a qualquer paciente"
        action={
          <button onClick={() => setCreatingTemplate(true)} className="rounded-full bg-brand-500 px-3 py-1.5 text-xs font-bold text-white">
            + Modelo
          </button>
        }
      />

      <div className="flex flex-col gap-2 px-4 pb-4">
        {templates.map((template) => (
          <button key={template.id} onClick={() => setPreviewTemplate(template)} className="card flex items-center gap-3 text-left">
            <span className="text-2xl">{template.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-brand-800">{template.name}</p>
              <p className="truncate text-xs text-brand-400">{template.description}</p>
            </div>
            <span className="shrink-0 text-xs font-bold text-brand-400">{template.items.length} itens</span>
          </button>
        ))}
      </div>

      <BottomSheet open={!!previewTemplate} onClose={() => setPreviewTemplate(null)} title="Antes de aplicar">
        {previewTemplate && (
          <TemplatePreview
            key={previewTemplate.id}
            template={previewTemplate}
            onBack={() => setPreviewTemplate(null)}
            confirmLabel="Escolher paciente"
            onConfirm={(reviewed) => {
              setPreviewTemplate(null);
              setSelectedTemplate(reviewed);
            }}
          />
        )}
      </BottomSheet>

      <BottomSheet open={!!selectedTemplate} onClose={() => setSelectedTemplate(null)} title={`Aplicar "${selectedTemplate?.name}"`}>
        <p className="mb-3 text-sm text-brand-500">Escolha o paciente que vai receber esta rotina:</p>
        <div className="flex flex-col gap-2">
          {patients.length === 0 ? (
            <p className="text-sm text-brand-400">Nenhum paciente vinculado ainda.</p>
          ) : (
            patients.map((p) => (
              <button key={p.patientId} onClick={() => handleApply(p.patientId)} disabled={applying} className="card flex items-center gap-3 text-left disabled:opacity-60">
                {p.photoURL ? (
                  <img src={p.photoURL} className="h-10 w-10 rounded-full object-cover" alt="" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-lg">👤</div>
                )}
                <p className="font-bold text-brand-800">{p.name}</p>
              </button>
            ))
          )}
        </div>
      </BottomSheet>

      {creatingTemplate && firebaseUser && (
        <CreateTemplateSheet professionalId={firebaseUser.uid} onClose={() => setCreatingTemplate(false)} />
      )}
    </div>
  );
}

function CreateTemplateSheet({ professionalId, onClose }: { professionalId: string; onClose: () => void }) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("⭐");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await saveTemplate(professionalId, { kind: "custom", name: name.trim(), description: description.trim(), icon, items: [] });
      showToast("Modelo criado. Adicione atividades a ele aplicando-o a um paciente e editando a rotina.");
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open onClose={onClose} title="Criar modelo em branco">
      <div className="flex flex-col gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do modelo" className="input-field" />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição (opcional)"
          rows={2}
          className="input-field resize-none"
        />
        <div>
          <p className="mb-1 text-xs font-bold text-brand-500">Ícone</p>
          <div className="flex flex-wrap gap-1.5">
            {ICON_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setIcon(opt)}
                className={clsx("flex h-9 w-9 items-center justify-center rounded-xl text-lg", icon === opt ? "bg-brand-500" : "bg-brand-50")}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <button className="btn-primary" onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? "Salvando..." : "Criar modelo"}
        </button>
      </div>
    </BottomSheet>
  );
}
