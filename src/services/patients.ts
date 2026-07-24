import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/firebase/config";
import type { PatientDoc, ProfessionalPatientLink, UserDoc } from "@/types";

/** Lista os vínculos ativos de uma profissional (base para a lista de pacientes). */
export function subscribeToLinkedPatients(
  professionalId: string,
  callback: (links: ProfessionalPatientLink[]) => void
) {
  const q = query(
    collection(db, "professionalPatientLinks"),
    where("professionalId", "==", professionalId),
    where("status", "==", "active")
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ProfessionalPatientLink)));
  });
}

export function subscribeToPatient(patientId: string, callback: (patient: PatientDoc | null) => void) {
  return onSnapshot(doc(db, "patients", patientId), (snapshot) => {
    callback(snapshot.exists() ? ({ uid: snapshot.id, ...snapshot.data() } as PatientDoc) : null);
  });
}

export function subscribeToUser(uid: string, callback: (user: UserDoc | null) => void) {
  return onSnapshot(doc(db, "users", uid), (snapshot) => {
    callback(snapshot.exists() ? ({ uid: snapshot.id, ...snapshot.data() } as UserDoc) : null);
  });
}

export async function getPatient(patientId: string): Promise<PatientDoc | null> {
  const snapshot = await getDoc(doc(db, "patients", patientId));
  return snapshot.exists() ? ({ uid: snapshot.id, ...snapshot.data() } as PatientDoc) : null;
}

interface FindPatientByEmailResult {
  found: boolean;
  patientId?: string;
  name?: string;
}

/**
 * Convida/cadastra um paciente já existente (por e-mail, previamente criado no Auth)
 * e cria o vínculo com a profissional. A busca por e-mail passa por uma Cloud Function
 * (não por uma query direta do cliente) para que nenhuma profissional consiga listar
 * ou "descobrir" pacientes que ainda não estão vinculados a ela.
 */
export async function linkPatientByEmail(professionalId: string, patientEmail: string): Promise<"linked" | "not_found"> {
  const findPatientByEmail = httpsCallable<{ email: string }, FindPatientByEmailResult>(functions, "findPatientByEmail");
  const { data } = await findPatientByEmail({ email: patientEmail.trim().toLowerCase() });
  if (!data.found || !data.patientId) return "not_found";

  const patientId = data.patientId;

  // Id determinístico (profissional_paciente): permite que as regras de segurança do
  // Firestore verifiquem o vínculo com um simples exists(), sem precisar de queries.
  await setDoc(doc(db, "professionalPatientLinks", `${professionalId}_${patientId}`), {
    professionalId,
    patientId,
    status: "active",
    createdAt: serverTimestamp(),
  });

  const patientRef = doc(db, "patients", patientId);
  const patientSnapshot = await getDoc(patientRef);
  if (!patientSnapshot.exists()) {
    await setDoc(patientRef, {
      uid: patientId,
      name: data.name ?? "",
      points: 0,
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
      active: true,
      createdAt: serverTimestamp(),
    });
  }

  return "linked";
}

export async function updatePatientPrivateNotes(patientId: string, notes: string) {
  await updateDoc(doc(db, "patients", patientId), { privateNotes: notes });
}
