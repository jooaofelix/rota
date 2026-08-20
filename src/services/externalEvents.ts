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
  callback: (itens: ExternalEventDoc[]) => void,
  onErro?: (mensagem: string) => void
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
    (erro) => {
      // Engolir esta falha calado foi um erro: o espelho dizia "218 espelhados"
      // e a grade continuava vazia, sem nenhuma pista de por quê. A agenda
      // segue funcionando sem os blocos, mas o motivo aparece na tela.
      callback([]);
      const codigo = (erro as { code?: string })?.code ?? "";
      onErro?.(
        codigo === "permission-denied"
          ? "Os blocos do Google não aparecem: falta publicar as regras do Firestore (firebase deploy --only firestore:rules)."
          : codigo === "failed-precondition"
            ? "Os blocos do Google não aparecem: falta o índice do Firestore (firebase deploy --only firestore:indexes)."
            : `Os blocos do Google não aparecem. [${codigo || "sem código"}]`
      );
    }
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
