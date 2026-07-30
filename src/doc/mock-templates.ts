export * from "../services/templates";
import type { RoutineTemplateDoc } from "@/types";
import { SYSTEM_ROUTINE_TEMPLATES } from "@/data/systemTemplates";

export function subscribeToTemplates(_p: string, cb: (t: RoutineTemplateDoc[]) => void) {
  cb(SYSTEM_ROUTINE_TEMPLATES);
  return () => undefined;
}
