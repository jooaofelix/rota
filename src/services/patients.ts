import { Timestamp, collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db, functions } from "@/firebase/config";
import { httpsCallable } from "firebase/functions";
import type { PatientDoc, ProfessionalPatientLink, UserDoc } from "@/types";
import { novoCodigoDeAcesso } from "@/utils/accessCode";

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

/**
 * Cria um paciente que existe só como cadastro, sem conta no aplicativo.
 *
 * É o caso da maioria: a pessoa é atendida, entra na agenda, gera prontuário e
 * nota, e nunca abre o app. Criar login para ela sem que tenha pedido seria
 * inventar uma conta em nome de outra pessoa — se um dia quiser usar o ROTA, ela
 * se cadastra e o vínculo passa a apontar para a conta dela.
 *
 * O vínculo é gravado antes do cadastro porque é ele que dá permissão para o
 * resto: as regras conferem o vínculo, não quem está escrevendo.
 */
export async function createContactPatient(
  professionalId: string,
  data: {
    name: string;
    email?: string;
    phone?: string;
    cpf?: string;
    birthDate?: Date;
    defaultPrice?: number;
    /** false para quem veio da planilha já com alta, desistência ou desativado. */
    ativo?: boolean;
  }
): Promise<string> {
  const patientId = `c_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const accessCode = novoCodigoDeAcesso();

  await setDoc(doc(db, "professionalPatientLinks", `${professionalId}_${patientId}`), {
    professionalId,
    patientId,
    status: "active",
    createdAt: serverTimestamp(),
  });

  await setDoc(doc(db, "patients", patientId), {
    uid: patientId,
    name: data.name.trim(),
    email: data.email?.trim() ?? "",
    phone: data.phone?.trim() ?? "",
    cpf: data.cpf?.trim() ?? "",
    ...(data.birthDate ? { birthDate: Timestamp.fromDate(data.birthDate) } : {}),
    ...(data.defaultPrice ? { defaultPrice: data.defaultPrice } : {}),
    hasAccount: false,
    accessCode,
    points: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    active: data.ativo ?? true,
    createdAt: serverTimestamp(),
  });

  return patientId;
}

/**
 * Dados de cadastro que a profissional mantém sobre o paciente.
 *
 * Ficam em /patients e não em /users porque são dela: o paciente não digita o
 * próprio CPF no app, e a data de nascimento serve ao acompanhamento, não ao
 * login.
 */
export async function updatePatientProfile(
  patientId: string,
  data: { birthDate?: Date | null; cpf?: string; phone?: string }
) {
  const payload: Record<string, unknown> = {};
  if (data.birthDate !== undefined) {
    payload.birthDate = data.birthDate ? Timestamp.fromDate(data.birthDate) : null;
  }
  if (data.cpf !== undefined) payload.cpf = data.cpf.trim();
  if (data.phone !== undefined) payload.phone = data.phone.trim();
  await updateDoc(doc(db, "patients", patientId), payload);
}

/**
 * O paciente assume o cadastro que a profissional já tinha feito para ele.
 *
 * A migração acontece na função: procurar cadastro por código exigiria ler a
 * coleção inteira, e mover o histórico entre ids precisa de uma escrita que as
 * regras não podem permitir ao aplicativo.
 */
export async function assumirCadastroPorCodigo(codigo: string): Promise<{ ok: boolean; erro?: string }> {
  const call = httpsCallable<{ codigo: string }, { ok: boolean; erro?: string }>(functions, "assumirCadastro");
  const resposta = await call({ codigo });
  return resposta.data;
}

/**
 * Arquiva ou reativa um paciente.
 *
 * Arquivar não apaga nada: o histórico continua inteiro, e é justamente por isso
 * que existe. Alta e desistência não são erro a esconder — são o fim de um
 * acompanhamento, e o registro do que aconteceu segue valendo para relatório,
 * para o imposto de renda e para o dia em que a pessoa voltar.
 */
export async function setPatientActive(patientId: string, active: boolean) {
  await updateDoc(doc(db, "patients", patientId), { active });
}

/** Gera (ou troca) o código de um cadastro que ainda não virou conta. */
export async function gerarCodigoDeAcesso(patientId: string): Promise<string> {
  const codigo = novoCodigoDeAcesso();
  await updateDoc(doc(db, "patients", patientId), { accessCode: codigo });
  return codigo;
}

export async function updatePatientPrivateNotes(patientId: string, notes: string) {
  await updateDoc(doc(db, "patients", patientId), { privateNotes: notes });
}
