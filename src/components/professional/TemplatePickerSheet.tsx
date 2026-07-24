import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/common/BottomSheet";
import type { RoutineTemplateDoc } from "@/types";
import { applyTemplateToPatient, subscribeToTemplates } from "@/services/templates";
import { useToast } from "@/contexts/ToastContext";

interface TemplatePickerSheetProps {
  professionalId: string;
  patientId: string;
  onClose: () => void;
}

export function TemplatePickerSheet({ professionalId, patientId, onClose }: TemplatePickerSheetProps) {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<RoutineTemplateDoc[]>([]);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => subscribeToTemplates(professionalId, setTemplates), [professionalId]);

  async function applyTemplate(template: RoutineTemplateDoc) {
    setApplying(template.id);
    try {
      await applyTemplateToPatient(template, patientId, professionalId);
      showToast(`Modelo "${template.name}" aplicado!`);
      onClose();
    } finally {
      setApplying(null);
    }
  }

  return (
    <BottomSheet open onClose={onClose} title="Escolha um modelo de rotina">
      <div className="flex flex-col gap-2">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => applyTemplate(template)}
            disabled={applying !== null}
            className="card flex items-center gap-3 text-left disabled:opacity-60"
          >
            <span className="text-2xl">{template.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-brand-800">{template.name}</p>
              <p className="truncate text-xs text-brand-400">{template.description}</p>
            </div>
            {applying === template.id && <span className="text-xs font-bold text-brand-400">Aplicando...</span>}
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
