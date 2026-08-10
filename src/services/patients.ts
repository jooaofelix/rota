import { collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "@/firebase/config";
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

/** Busca a profissional vinculada a um paciente (usado quando o próprio paciente cria itens da rotina). */
export async function getLinkedProfessionalId(patientId: string): Promise<string | null> {
  const q = query(
    collection(db, "professionalPatientLinks"),
    where("patientId", "==", patientId),
    where("status", "==", "active")
  );
  const snapshot = await getDocs(q);
  const link = snapshot.docs[0]?.data() as ProfessionalPatientLink | undefined;
  return link?.professionalId ?? null;
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

/** Uma leitura só, para quando basta o e-mail ou o nome de cadastro. */
export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const snapshot = await getDoc(doc(db, "users", uid));
  return snapshot.exists() ? ({ uid: snapshot.id, ...snapshot.data() } as UserDoc) : null;
}

export async function getPatient(patientId: string): Promise<PatientDoc | null> {
  const snapshot = await getDoc(doc(db, "patients", patientId));
  return snapshot.exists() ? ({ uid: snapshot.id, ...snapshot.data() } as PatientDoc) : null;
}

/**
 * Vincula um paciente já cadastrado à profissional, a partir do código do paciente
 * (o próprio uid dele, mostrado no Perfil > "Seu código"). Usar um código em vez de
 * busca por e-mail evita depender de uma Cloud Function (que exige o plano pago do
 * Firebase) e evita expor uma forma de "descobrir" pacientes não vinculados: a
 * profissional só consegue ler os dados do paciente depois que o vínculo já existe.
 */
export async function linkPatientByCode(professionalId: string, patientCode: string): Promise<"linked" | "not_found"> {
  const patientId = patientCode.trim();
  if (!patientId) return "not_found";

  // Id determinístico (profissional_paciente): permite que as regras de segurança do
  // Firestore verifiquem o vínculo com um simples exists(), sem precisar de queries.
  const linkRef = doc(db, "professionalPatientLinks", `${professionalId}_${patientId}`);
  await setDoc(linkRef, {
    professionalId,
    patientId,
    status: "active",
    createdAt: serverTimestamp(),
  });

  // Só depois de criar o vínculo é que a profissional tem permissão para ler o
  // usuário — por isso a validação do código acontece aqui, e não antes.
  const userSnapshot = await getDoc(doc(db, "users", patientId));
  if (!userSnapshot.exists() || userSnapshot.data().role !== "patient") {
    await updateDoc(linkRef, { status: "ended" });
    return "not_found";
  }

  const patientRef = doc(db, "patients", patientId);
  const patientSnapshot = await getDoc(patientRef);
  if (!patientSnapshot.exists()) {
    await setDoc(patientRef, {
      uid: patientId,
      name: userSnapshot.data().name ?? "",
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
