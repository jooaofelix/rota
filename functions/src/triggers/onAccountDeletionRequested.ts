import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { db, app } from "../admin";

const PATIENT_COLLECTIONS = [
  "routines",
  "routineItems",
  "completions",
  "emotionRecords",
  "rewards",
  "rewardAchievements",
  "messages",
  "reports",
];

async function deleteWhere(collectionName: string, field: string, value: string) {
  const snap = await db.collection(collectionName).where(field, "==", value).get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
}

/**
 * Processa pedidos de exclusão de conta (LGPD): remove os dados do usuário nas
 * coleções relacionadas, os arquivos no Storage e a conta no Firebase Auth.
 */
export const onAccountDeletionRequested = onDocumentCreated("auditLogs/{logId}", async (event) => {
  const log = event.data?.data();
  if (!log || log.action !== "account_deletion_requested") return;

  const uid = log.targetId as string;

  for (const collectionName of PATIENT_COLLECTIONS) {
    await deleteWhere(collectionName, "patientId", uid).catch(() => undefined);
  }
  await deleteWhere("notifications", "recipientId", uid).catch(() => undefined);
  await deleteWhere("professionalPatientLinks", "patientId", uid).catch(() => undefined);
  await deleteWhere("professionalPatientLinks", "professionalId", uid).catch(() => undefined);

  await db.collection("patients").doc(uid).delete().catch(() => undefined);
  await db.collection("professionals").doc(uid).delete().catch(() => undefined);
  await db.collection("users").doc(uid).delete().catch(() => undefined);

  await getStorage(app)
    .bucket()
    .deleteFiles({ prefix: `patients/${uid}/` })
    .catch(() => undefined);

  await getAuth(app)
    .deleteUser(uid)
    .catch(() => undefined);
});
