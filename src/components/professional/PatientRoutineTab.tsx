import { useEffect, useState } from "react";
import { subscribeToRoutineItems, subscribeToPatientRoutines, createRoutine } from "@/services/routines";
import type { RoutineDoc, RoutineItemDoc } from "@/types";
import { ActivityCard } from "@/components/patient/ActivityCard";
import { ActivityEditorSheet } from "./ActivityEditorSheet";
import { TemplatePickerSheet } from "./TemplatePickerSheet";
import { EmptyState } from "@/components/common/EmptyState";
import { getTodayStatus, isScheduledOn, sortByPeriodAndTime } from "@/utils/schedule";
import { PERIOD_LABELS } from "@/utils/constants";

export function PatientRoutineTab({ patientId, professionalId }: { patientId: string; professionalId: string }) {
  const [routines, setRoutines] = useState<RoutineDoc[]>([]);
  const [items, setItems] = useState<RoutineItemDoc[]>([]);
  const [editingItem, setEditingItem] = useState<RoutineItemDoc | "new" | null>(null);
  const [pickingTemplate, setPickingTemplate] = useState(false);
  const [pendingRoutineId, setPendingRoutineId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = [subscribeToPatientRoutines(patientId, setRoutines), subscribeToRoutineItems(patientId, setItems)];
    return () => unsub.forEach((u) => u());
  }, [patientId]);

  const activeRoutine = routines.find((r) => r.status === "active");
  const todayItems = sortByPeriodAndTime(items.filter((i) => isScheduledOn(i)));

  async function handleNewActivity() {
    if (!activeRoutine && routines.length === 0) {
      const newRoutineId = await createRoutine(professionalId, patientId, { title: "Rotina do paciente", description: "", templateKind: "custom" });
      setPendingRoutineId(newRoutineId);
    }
    setEditingItem("new");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button className="btn-primary" onClick={handleNewActivity}>
          + Nova atividade
        </button>
        <button className="btn-secondary" onClick={() => setPickingTemplate(true)}>
          📋 Usar modelo
        </button>
      </div>

      {todayItems.length === 0 ? (
        <EmptyState icon="🌱" title="Nenhuma atividade programada para hoje" description="Adicione uma atividade ou aplique um modelo pronto." />
      ) : (
        (["morning", "afternoon", "evening"] as const).map((period) => {
          const periodItems = todayItems.filter((i) => i.period === period);
          if (!periodItems.length) return null;
          return (
            <div key={period}>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-brand-400">{PERIOD_LABELS[period]}</p>
              <div className="flex flex-col gap-2">
                {periodItems.map((item) => (
                  <ActivityCard key={item.id} item={item} status={getTodayStatus(item, undefined)} onOpen={() => setEditingItem(item)} />
                ))}
              </div>
            </div>
          );
        })
      )}

      {editingItem && (
        <ActivityEditorSheet
          patientId={patientId}
          professionalId={professionalId}
          routineId={activeRoutine?.id ?? pendingRoutineId ?? routines[0]?.id ?? ""}
          existingItem={editingItem === "new" ? undefined : editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}

      {pickingTemplate && (
        <TemplatePickerSheet professionalId={professionalId} patientId={patientId} onClose={() => setPickingTemplate(false)} />
      )}
    </div>
  );
}
