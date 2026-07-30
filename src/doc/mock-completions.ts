export * from "../services/completions";
import type { CompletionDoc } from "@/types";
import { DEMO_COMPLETIONS } from "./demo-data";

export function subscribeToCompletionsForDate(_p: string, _d: string, cb: (c: CompletionDoc[]) => void) {
  cb(DEMO_COMPLETIONS);
  return () => undefined;
}
export function subscribeToPatientHistory(_p: string, cb: (c: CompletionDoc[]) => void) {
  cb(DEMO_COMPLETIONS);
  return () => undefined;
}
