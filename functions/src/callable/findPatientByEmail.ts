import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../admin";

interface FindPatientByEmailData {
  email: string;
}

/**
 * Busca um paciente por e-mail para a profissional vincular. Roda no backend (Admin SDK)
 * para que o cliente nunca precise de permissão de leitura ampla sobre a coleção `users` —
 * assim uma profissional não consegue descobrir pacientes que não estão vinculados a ela.
 */
export const findPatientByEmail = onCall<FindPatientByEmailData>(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É preciso estar autenticado.");
  }

  const callerSnap = await db.collection("users").doc(request.auth.uid).get();
  if (!callerSnap.exists || callerSnap.data()?.role !== "professional") {
    throw new HttpsError("permission-denied", "Apenas profissionais podem vincular pacientes.");
  }

  const email = (request.data?.email ?? "").trim().toLowerCase();
  if (!email) {
    throw new HttpsError("invalid-argument", "Informe um e-mail válido.");
  }

  const snap = await db.collection("users").where("email", "==", email).where("role", "==", "patient").limit(1).get();
  if (snap.empty) {
    return { found: false };
  }

  const patientDoc = snap.docs[0];
  return { found: true, patientId: patientDoc.id, name: (patientDoc.data().name as string) ?? "" };
});
