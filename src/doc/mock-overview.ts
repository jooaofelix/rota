export * from "../services/professionalOverview";
import { DEMO_PATIENT, PATIENT_ID } from "./demo-data";

export async function getPatientsOverview() {
  return [{ patientId: PATIENT_ID, name: DEMO_PATIENT.name, photoURL: undefined }] as never;
}
