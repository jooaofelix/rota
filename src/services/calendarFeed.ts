import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { PrivacidadeCalendario } from "@/utils/ics";

const COLECAO = "calendarFeeds";

export interface CalendarFeedDoc {
  id: string;
  professionalId: string;
  /** O endereço da assinatura é este código. Trocar o código derruba a assinatura antiga. */
  token: string;
  privacidade: PrivacidadeCalendario;
  ativo: boolean;
  /** Endereço secreto do Google Agenda dela, quando o espelho está ligado. */
  googleIcsUrl?: string;
  googleAtivo?: boolean;
  googleEventos?: number;
  googleErro?: string;
}

/** Sorteia um código longo: o endereço do calendário é a credencial dele. */
function novoToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

export function subscribeToFeed(professionalId: string, callback: (f: CalendarFeedDoc | null) => void) {
  return onSnapshot(doc(db, COLECAO, professionalId), (snap) =>
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as CalendarFeedDoc) : null)
  );
}

/** Cria na primeira vez; nas seguintes devolve o que já existe. */
export async function garantirFeed(professionalId: string): Promise<CalendarFeedDoc> {
  const ref = doc(db, COLECAO, professionalId);
  const snap = await getDoc(ref);
  if (snap.exists()) return { id: snap.id, ...snap.data() } as CalendarFeedDoc;

  const feed = {
    professionalId,
    token: novoToken(),
    // Iniciais por padrão: calendário assinado espelha para o celular, para o
    // relógio e às vezes para a tela do carro, e nome de paciente é dado de saúde.
    privacidade: "iniciais" as PrivacidadeCalendario,
    ativo: true,
  };
  await setDoc(ref, { ...feed, createdAt: serverTimestamp() });
  return { id: professionalId, ...feed };
}

export async function trocarPrivacidade(professionalId: string, privacidade: PrivacidadeCalendario) {
  await updateDoc(doc(db, COLECAO, professionalId), { privacidade });
}

/** Novo código: quem tinha o endereço antigo para de receber. */
export async function trocarToken(professionalId: string): Promise<string> {
  const token = novoToken();
  await updateDoc(doc(db, COLECAO, professionalId), { token });
  return token;
}

export async function desligarEspelhoGoogle(professionalId: string) {
  await updateDoc(doc(db, COLECAO, professionalId), { googleAtivo: false });
}

export async function desligarFeed(professionalId: string, ativo: boolean) {
  await updateDoc(doc(db, COLECAO, professionalId), { ativo });
}

/** Endereço público do feed. A região é a mesma das outras funções. */
export function enderecoDoFeed(token: string): string {
  const projeto = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  return `https://southamerica-east1-${projeto}.cloudfunctions.net/agendaIcs?t=${token}`;
}
