export * from "../services/professionalOverview";
import type { PatientOverview } from "../services/professionalOverview";
import { DEMO_OVERVIEW } from "./demo-data";

export async function getPatientsOverview(): Promise<PatientOverview[]> {
  return DEMO_OVERVIEW;
}
