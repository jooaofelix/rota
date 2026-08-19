import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db, functions } from "@/firebase/config";
import { httpsCallable } from "firebase/functions";

/**
 * Compromissos que vieram do Google Agenda dela.
 *
 * São cópia, não fonte: aparecem na grade como blocos de ocupado e não podem
 * ser editados aqui. Quem manda neles é o Google — mexer aqui só criaria a
 * ilusão de ter mudado alguma coisa lá.
 */
export interface ExternalEventDoc {
  id: string;
  professionalId: string;
  titulo: string;
  date: string;
  startTime: string;
  endTime: string;
  diaInteiro?: boolean;
  origem: "google";
}

export function subscribeToExternalEvents(
  professionalId: string,
  start: string,
  end: string,
  callback: (itens: ExternalEventDoc[]) => void
) {
  const q = query(
    collection(db, "externalEvents"),
    where("professionalId", "==", professionalId),
    where("date", ">=", start),
    where("date", "<=", end)
  );
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ExternalEventDoc))),
    // Antes do primeiro espelhamento a coleção nem existe; falhar aqui deixaria
    // a agenda inteira em branco por causa de um recurso opcional.
    () => callback([])
  );
}

/** Lê o calendário do Google agora, sem esperar a próxima passagem automática. */
export async function espelharAgora(url?: string): Promise<{ ok: boolean; total?: number; erro?: string }> {
  const call = httpsCallable<{ url?: string }, { ok: boolean; total?: number; erro?: string }>(
    functions,
    "espelharGoogleAgora"
  );
  const resposta = await call({ url });
  return resposta.data;
}
