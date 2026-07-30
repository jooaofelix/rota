export * from "../services/patients";
import type { PatientDoc, ProfessionalPatientLink } from "@/types";
import { DEMO_OVERVIEW, DEMO_PATIENT, PROFESSIONAL_ID } from "./demo-data";

export async function getLinkedProfessionalId() {
  return PROFESSIONAL_ID;
}
export function subscribeToLinkedPatients(_p: string, cb: (l: ProfessionalPatientLink[]) => void) {
  cb(
    DEMO_OVERVIEW.map((o) => ({
      id: `${PROFESSIONAL_ID}_${o.patientId}`,
      professionalId: PROFESSIONAL_ID,
      patientId: o.patientId,
      status: "active" as const,
      createdAt: DEMO_PATIENT.createdAt,
    }))
  );
  return () => undefined;
}
export function subscribeToPatient(_p: string, cb: (p: PatientDoc | null) => void) {
  cb(DEMO_PATIENT);
  return () => undefined;
}
