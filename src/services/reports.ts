import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, where, type WithFieldValue } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { ReportDoc } from "@/types";

export function subscribeToPatientReports(patientId: string, callback: (reports: ReportDoc[]) => void) {
  const q = query(collection(db, "reports"), where("patientId", "==", patientId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ReportDoc)));
  });
}

export async function saveReportRecord(data: Omit<ReportDoc, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "reports"), {
    ...data,
    createdAt: serverTimestamp(),
  } satisfies WithFieldValue<Omit<ReportDoc, "id">>);
  return ref.id;
}
