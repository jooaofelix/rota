import { FieldValue } from "firebase-admin/firestore";
import { db } from "./admin";

/** Garante que um lembrete com essa chave só seja enviado uma vez (idempotência entre execuções agendadas). */
export async function sendOnce(key: string, action: () => Promise<void>): Promise<void> {
  try {
    await db.collection("notificationDedup").doc(key).create({ createdAt: FieldValue.serverTimestamp() });
  } catch {
    return; // já enviado
  }
  await action();
}
