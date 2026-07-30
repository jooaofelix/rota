export * from "../services/routines";
import type { RoutineDoc, RoutineItemDoc } from "@/types";
import { DEMO_ITEMS, DEMO_ROUTINE } from "./demo-data";

export function subscribeToPatientRoutines(_p: string, cb: (r: RoutineDoc[]) => void) {
  cb([DEMO_ROUTINE]);
  return () => undefined;
}
export function subscribeToRoutineItems(_p: string, cb: (i: RoutineItemDoc[]) => void) {
  cb(DEMO_ITEMS);
  return () => undefined;
}
export async function updateRoutineItem() {
  /* nas capturas nada é gravado */
}
