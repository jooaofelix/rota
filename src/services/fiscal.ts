import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { FiscalProfileDoc } from "@/types";

const FISCAL = "fiscalProfiles";

export function subscribeToFiscalProfile(
  uid: string,
  callback: (profile: FiscalProfileDoc | null) => void
) {
  return onSnapshot(doc(db, FISCAL, uid), (snap) => {
    callback(snap.exists() ? ({ uid: snap.id, ...snap.data() } as FiscalProfileDoc) : null);
  });
}

export async function getFiscalProfile(uid: string): Promise<FiscalProfileDoc | null> {
  const snap = await getDoc(doc(db, FISCAL, uid));
  return snap.exists() ? ({ uid: snap.id, ...snap.data() } as FiscalProfileDoc) : null;
}

export async function saveFiscalProfile(uid: string, data: Partial<FiscalProfileDoc>) {
  await setDoc(doc(db, FISCAL, uid), { ...data, uid, updatedAt: serverTimestamp() }, { merge: true });
}

/**
 * O que ainda falta para conseguir emitir.
 *
 * Não é validação de formulário: é a lista que ela vai levar para o contador. A
 * emissão trava por falta de cadastro muito mais do que por erro de sistema.
 */
export function fiscalGaps(p: FiscalProfileDoc | null): string[] {
  if (!p) return ["Nenhum dado fiscal preenchido ainda."];
  const faltando: string[] = [];
  if (p.regime === "indefinido") faltando.push("Definir se emite como empresa (CNPJ) ou como autônoma (CPF).");
  if (!p.legalName?.trim()) faltando.push("Razão social ou nome civil completo.");
  const pj = p.regime === "pj_simples" || p.regime === "pj_outro" || p.regime === "mei";
  if (pj && !p.cnpj?.trim()) faltando.push("CNPJ.");
  if (!pj && p.regime !== "indefinido" && !p.cpf?.trim()) faltando.push("CPF.");
  if (!p.inscricaoMunicipal?.trim()) faltando.push("Inscrição municipal (CCM) — sem ela não há emissão.");
  if (!p.municipio?.trim()) faltando.push("Município de emissão.");
  if (!p.codigoServico?.trim()) faltando.push("Código do serviço na lista da LC 116 (psicologia costuma ser 4.16).");
  if (!p.enderecoLinha1?.trim()) faltando.push("Endereço do estabelecimento.");
  return faltando;
}
