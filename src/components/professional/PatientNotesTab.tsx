import { useState } from "react";
import { updatePatientPrivateNotes } from "@/services/patients";
import { useToast } from "@/contexts/ToastContext";

export function PatientNotesTab({ patientId, initialNotes }: { patientId: string; initialNotes: string }) {
  const { showToast } = useToast();
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updatePatientPrivateNotes(patientId, notes);
      showToast("Observações salvas.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="card border-2 border-amber-100 bg-amber-50">
        <p className="text-xs font-bold text-amber-700">🔒 Somente você vê estas observações. O paciente não tem acesso a este campo.</p>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={10}
        className="input-field resize-none"
        placeholder="Observações clínicas, contexto familiar, pontos de atenção..."
      />
      <button className="btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? "Salvando..." : "Salvar observações"}
      </button>
    </div>
  );
}
