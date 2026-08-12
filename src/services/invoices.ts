import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/firebase/config";
import type { InvoiceDoc, SessionDoc } from "@/types";

const INVOICES = "invoices";

export function subscribeToInvoices(professionalId: string, callback: (items: InvoiceDoc[]) => void) {
  const q = query(collection(db, INVOICES), where("professionalId", "==", professionalId));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as InvoiceDoc));
    callback(items.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)));
  });
}

/** Rascunho a partir de um atendimento. Nada é transmitido até ela mandar. */
export async function draftFromSession(
  session: SessionDoc,
  descricao: string,
  patientCpf?: string
): Promise<string> {
  const ref = await addDoc(collection(db, INVOICES), {
    professionalId: session.professionalId,
    sessionId: session.id,
    patientId: session.patientId,
    patientName: session.patientName,
    patientCpf: patientCpf ?? null,
    description: descricao,
    value: session.price ?? 0,
    competencia: `${session.date.slice(0, 7)}-01`,
    status: "rascunho",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateInvoice(id: string, data: Partial<InvoiceDoc>) {
  await updateDoc(doc(db, INVOICES, id), { ...data, updatedAt: serverTimestamp() });
}

/**
 * Pede a emissão.
 *
 * A transmissão acontece na função, não aqui: o certificado digital e a chave do
 * emissor não podem existir no navegador — qualquer pessoa com o app aberto
 * teria como emitir nota em nome dela.
 */
export async function emitirNota(invoiceId: string): Promise<{ ok: boolean; erro?: string }> {
  const call = httpsCallable<{ invoiceId: string }, { ok: boolean; erro?: string }>(functions, "emitirNfse");
  const resposta = await call({ invoiceId });
  return resposta.data;
}

export async function cancelarNota(invoiceId: string, motivo: string): Promise<{ ok: boolean; erro?: string }> {
  const call = httpsCallable<{ invoiceId: string; motivo: string }, { ok: boolean; erro?: string }>(
    functions,
    "cancelarNfse"
  );
  const resposta = await call({ invoiceId, motivo });
  return resposta.data;
}
