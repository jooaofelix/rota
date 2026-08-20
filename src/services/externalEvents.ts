import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";
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
  onErro?: (erro: { mensagem: string; link?: string }) => void
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
      const texto = (erro as { message?: string })?.message ?? "";

      // Quando falta índice, o próprio Firestore devolve um endereço que o cria
      // com um clique. Repassar esse endereço poupa uma viagem ao terminal —
      // e é a diferença entre resolver agora e resolver amanhã.
      const link = texto.match(/https:\/\/console\.firebase\.google\.com\/\S+/)?.[0]?.replace(/[.,)]+$/, "");

      onErro?.({
        mensagem:
          codigo === "permission-denied"
            ? "Os blocos do Google não aparecem: falta publicar as regras do Firestore (firebase deploy --only firestore:rules)."
            : codigo === "failed-precondition"
              ? "Os blocos do Google não aparecem porque falta um índice no Firestore. Dá para criar com um clique:"
              : `Os blocos do Google não aparecem. [${codigo || "sem código"}] ${texto.slice(0, 160)}`,
        link,
      });
    }
  );
}

/** Uma leitura só, para a tela que converte os blocos em atendimentos. */
export async function getExternalEvents(
  professionalId: string,
  start: string,
  end: string
): Promise<ExternalEventDoc[]> {
  const snap = await getDocs(
    query(
      collection(db, "externalEvents"),
      where("professionalId", "==", professionalId),
      where("date", ">=", start),
      where("date", "<=", end)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ExternalEventDoc));
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
