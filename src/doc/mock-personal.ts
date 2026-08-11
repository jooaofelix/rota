import { Timestamp } from "firebase/firestore";
import type { PersonalEventDoc } from "@/types";
import { PROFESSIONAL_ID } from "./demo-data";

export * from "../services/personalEvents";

const now = Timestamp.now();
const hoje = new Date().toISOString().slice(0, 10);

const EVENTOS: PersonalEventDoc[] = [
  { id: "e1", professionalId: PROFESSIONAL_ID, title: "Almoço", kind: "break", date: hoje, startTime: "12:00", endTime: "13:00", createdAt: now, updatedAt: now },
  { id: "e2", professionalId: PROFESSIONAL_ID, title: "Supervisão", kind: "study", date: hoje, startTime: "18:00", endTime: "19:00", note: "Levar o caso da Ana", createdAt: now, updatedAt: now },
  { id: "e3", professionalId: PROFESSIONAL_ID, title: "Anotar prontuários", kind: "admin", date: hoje, done: false, createdAt: now, updatedAt: now },
  { id: "e4", professionalId: PROFESSIONAL_ID, title: "Banco / contador", kind: "errand", date: hoje, done: true, createdAt: now, updatedAt: now },
];

export function subscribeToPersonalEventsInRange(_p: string, _s: string, _e: string, cb: (i: PersonalEventDoc[]) => void) {
  cb(EVENTOS);
  return () => undefined;
}
export async function setPersonalEventDone() {
  return undefined;
}
