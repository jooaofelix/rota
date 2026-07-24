import { addDoc, collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { UserRole } from "@/types";

const PATIENT_COLLECTIONS_BY_FIELD: Array<{ collection: string; field: string }> = [
  { collection: "routines", field: "patientId" },
  { collection: "routineItems", field: "patientId" },
  { collection: "completions", field: "patientId" },
  { collection: "emotionRecords", field: "patientId" },
  { collection: "rewards", field: "patientId" },
  { collection: "rewardAchievements", field: "patientId" },
  { collection: "messages", field: "patientId" },
  { collection: "notifications", field: "recipientId" },
  { collection: "reports", field: "patientId" },
];

/** Exporta todos os dados do paciente em um único objeto JSON (direito de portabilidade da LGPD). */
export async function exportPatientData(patientId: string): Promise<Record<string, unknown[]>> {
  const result: Record<string, unknown[]> = {};

  for (const { collection: collectionName, field } of PATIENT_COLLECTIONS_BY_FIELD) {
    const snapshot = await getDocs(query(collection(db, collectionName), where(field, "==", patientId)));
    result[collectionName] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  return result;
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Registra o pedido de exclusão de conta e desativa o usuário imediatamente.
 * A remoção definitiva dos dados (incluindo a conta no Firebase Auth) é concluída
 * por uma Cloud Function assíncrona, que respeita prazos legais de guarda quando aplicável.
 */
export async function requestAccountDeletion(uid: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db, "users", uid), { active: false });
  await addDoc(collection(db, "auditLogs"), {
    actorId: uid,
    actorRole: role,
    action: "account_deletion_requested",
    targetType: "user",
    targetId: uid,
    createdAt: serverTimestamp(),
  });
}

export async function acceptConsent(uid: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    consentAcceptedAt: serverTimestamp(),
    termsAcceptedAt: serverTimestamp(),
  });
}
