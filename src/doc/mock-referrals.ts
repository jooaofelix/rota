import type { ReferralDoc } from "@/types";

export * from "../services/referrals";

export function subscribeToPatientReferrals(_p: string, cb: (i: ReferralDoc[]) => void) {
  cb([]);
  return () => undefined;
}
export async function recordReferral() {
  return undefined;
}
