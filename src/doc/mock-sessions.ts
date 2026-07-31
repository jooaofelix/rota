export * from "../services/sessions";
import type { SessionDoc } from "@/types";
import { DEMO_SESSIONS } from "./demo-data";

export function subscribeToSessionsInRange(_p: string, start: string, end: string, cb: (s: SessionDoc[]) => void) {
  cb(DEMO_SESSIONS.filter((s) => s.date >= start && s.date <= end));
  return () => undefined;
}
export function subscribeToUpcomingSessions(_p: string, cb: (s: SessionDoc[]) => void) {
  const hoje = new Date().toISOString().slice(0, 10);
  cb(DEMO_SESSIONS.filter((s) => s.date >= hoje));
  return () => undefined;
}

export async function getRecordForSession() {
  return null; // nas capturas o registro começa em branco
}

export function subscribeToProfessionalRecords(_p: string, cb: (r: never[]) => void) {
  cb([]);
  return () => undefined;
}
