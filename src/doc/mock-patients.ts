export * from "../services/patients";
import type { PatientDoc, ProfessionalPatientLink } from "@/types";
import { DEMO_PATIENT, PATIENT_ID, PROFESSIONAL_ID } from "./demo-data";

export async function getLinkedProfessionalId() {
  return PROFESSIONAL_ID;
}
export function subscribeToLinkedPatients(_p: string, cb: (l: ProfessionalPatientLink[]) => void) {
  cb([{ id: `${PROFESSIONAL_ID}_${PATIENT_ID}`, professionalId: PROFESSIONAL_ID, patientId: PATIENT_ID, status: "active", createdAt: DEMO_PATIENT.createdAt }]);
  return () => undefined;
}
export function subscribeToPatient(_p: string, cb: (p: PatientDoc | null) => void) {
  cb(DEMO_PATIENT);
  return () => undefined;
}
