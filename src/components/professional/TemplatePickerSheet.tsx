import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/common/BottomSheet";
import { TemplatePreview } from "@/components/common/TemplatePreview";
import type { RoutineTemplateDoc } from "@/types";
import { applyTemplateToPatient, subscribeToTemplates } from "@/services/templates";
import { useToast } from "@/contexts/ToastContext";

interface TemplatePickerSheetProps {
  professionalId: string;
  patientId: string;
  createdBy?: "patient" | "professional";
  onClose: () => void;
}

export function TemplatePickerSheet({ professionalId, patientId, createdBy = "professional", onClose }: TemplatePickerSheetProps) {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<RoutineTemplateDoc[]>([]);
  const [selected, setSelected] = useState<RoutineTemplateDoc | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => subscribeToTemplates(professionalId, setTemplates), [professionalId]);

  async function applyTemplate(template: RoutineTemplateDoc) {
    setApplying(true);
    try {
      await applyTemplateToPatient(template, patientId, professionalId, createdBy);
      showToast(`Modelo "${template.name}" aplicado!`);
      onClose();
    } finally {
      setApplying(false);
    }
  }

  if (selected) {
    return (
      <BottomSheet open onClose={onClose} title="Antes de aplicar">
        <TemplatePreview
          key={selected.id}
          template={selected}
          onBack={() => setSelected(null)}
          onConfirm={applyTemplate}
          busy={applying}
        />
      </BottomSheet>
    );
  }

  return (
    <BottomSheet open onClose={onClose} title="Escolha um modelo de rotina">
      <p className="mb-3 text-sm text-brand-500">
        Toque em um modelo para ver como ele funciona e o que entra na rotina. Nada é aplicado antes de você confirmar.
      </p>
      <div className="flex flex-col gap-2">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => setSelected(template)}
            className="card flex items-center gap-3 text-left"
          >
            <span className="text-2xl">{template.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-brand-800">{template.name}</p>
              <p className="truncate text-xs text-brand-400">{template.description}</p>
            </div>
            <span className="shrink-0 text-xs font-bold text-brand-300">
              {template.items.length === 0 ? "vazio" : `${template.items.length} itens`}
            </span>
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
