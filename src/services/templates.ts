import { addDoc, collection, onSnapshot, query, serverTimestamp, where, type WithFieldValue } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { RoutineTemplateDoc } from "@/types";
import { SYSTEM_ROUTINE_TEMPLATES } from "@/data/systemTemplates";
import { createRoutine, createRoutineItem } from "./routines";

/** Modelos disponíveis para a profissional: os padrões do sistema + os que ela criou. */
export function subscribeToTemplates(professionalId: string, callback: (templates: RoutineTemplateDoc[]) => void) {
  const q = query(collection(db, "routineTemplates"), where("professionalId", "==", professionalId));
  return onSnapshot(q, (snapshot) => {
    const custom = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as RoutineTemplateDoc));
    callback([...SYSTEM_ROUTINE_TEMPLATES, ...custom]);
  });
}

export async function saveTemplate(
  professionalId: string,
  data: Pick<RoutineTemplateDoc, "kind" | "name" | "description" | "icon" | "items">
): Promise<string> {
  const ref = await addDoc(collection(db, "routineTemplates"), {
    ...data,
    professionalId,
    createdAt: serverTimestamp(),
  } satisfies WithFieldValue<Omit<RoutineTemplateDoc, "id">>);
  return ref.id;
}

/** Cria uma rotina para o paciente a partir de um modelo, copiando todas as atividades. */
export async function applyTemplateToPatient(
  template: RoutineTemplateDoc,
  patientId: string,
  professionalId: string
): Promise<string> {
  const routineId = await createRoutine(professionalId, patientId, {
    title: template.name,
    description: template.description,
    templateKind: template.kind,
  });

  for (const [index, item] of template.items.entries()) {
    await createRoutineItem(
      {
        routineId,
        patientId,
        professionalId,
        title: item.title,
        description: item.description ?? "",
        instruction: item.instruction ?? "",
        period: item.period,
        time: item.time,
        durationMinutes: item.durationMinutes,
        frequency: item.frequency,
        weekdays: item.weekdays,
        category: item.category,
        priority: item.priority,
        icon: item.icon,
        points: item.points,
        order: index,
        createdBy: "professional",
      },
      false
    );
  }

  return routineId;
}
