import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../admin";
import { lerCalendario } from "../shared/icsParse";

/**
 * Espelha o Google Agenda dentro do ROTA.
 *
 * A profissional cola o endereço secreto do calendário dela (Google Agenda ›
 * Configurações do calendário › Endereço secreto em formato iCal) e o ROTA
 * passa a ler de tempos em tempos. O que estiver lá aparece na grade como
 * bloco de ocupado — ela não marca paciente em cima do compromisso que só
 * existia no Google.
 *
 * É leitura, e só. Estes blocos nunca viram atendimento: sessão carrega
 * paciente, valor e prontuário, e um evento de calendário não tem nada disso.
 * Quem quer trazer atendimento de verdade usa a importação única, que passa
 * pela conferência dela.
 */

const JANELA_ATRAS = 7;
const JANELA_FRENTE = 120;

function dia(offset: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

const chave = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Busca, lê e regrava a janela inteira.
 *
 * Apaga e reescreve em vez de conciliar item a item: o calendário externo é
 * cópia, não fonte. Reconciliar exigiria casar identificadores que o Google
 * reescreve quando a série muda, e o erro apareceria como compromisso fantasma
 * na agenda de alguém.
 */
async function espelhar(professionalId: string, url: string): Promise<{ total: number }> {
  const resposta = await fetch(url, { redirect: "follow" });
  if (!resposta.ok) throw new Error(`O Google respondeu ${resposta.status}`);

  const texto = await resposta.text();
  const de = dia(-JANELA_ATRAS);
  const ate = dia(JANELA_FRENTE);
  const eventos = lerCalendario(texto, de, ate);

  const colecao = db.collection("externalEvents");
  const antigos = await colecao.where("professionalId", "==", professionalId).get();

  // Em lotes de 400: o limite de uma operação em lote do Firestore é 500.
  for (let i = 0; i < antigos.size; i += 400) {
    const lote = db.batch();
    antigos.docs.slice(i, i + 400).forEach((d) => lote.delete(d.ref));
    await lote.commit();
  }

  for (let i = 0; i < eventos.length; i += 400) {
    const lote = db.batch();
    eventos.slice(i, i + 400).forEach((e) => {
      lote.set(colecao.doc(), {
        professionalId,
        titulo: e.titulo,
        date: e.data,
        startTime: e.inicio,
        endTime: e.fim,
        diaInteiro: e.diaInteiro,
        origem: "google",
        atualizadoEm: FieldValue.serverTimestamp(),
      });
    });
    await lote.commit();
  }

  await db.collection("calendarFeeds").doc(professionalId).set(
    {
      googleUltimaLeitura: FieldValue.serverTimestamp(),
      googleEventos: eventos.length,
      googleErro: FieldValue.delete(),
    },
    { merge: true }
  );

  return { total: eventos.length };
}

/** De meia em meia hora, para todo mundo que ligou o espelho. */
export const espelharGoogleAgenda = onSchedule(
  { schedule: "every 30 minutes", region: "southamerica-east1", timeoutSeconds: 540 },
  async () => {
    const feeds = await db.collection("calendarFeeds").where("googleAtivo", "==", true).get();
    for (const feed of feeds.docs) {
      const url = feed.data().googleIcsUrl as string | undefined;
      if (!url) continue;
      try {
        await espelhar(feed.id, url);
      } catch (erro) {
        // Guarda o motivo em vez de sumir com o problema: endereço trocado no
        // Google é a causa mais comum, e ela precisa ver isso na tela.
        await feed.ref.set({ googleErro: String(erro).slice(0, 200) }, { merge: true });
      }
    }
  }
);

/**
 * A mesma leitura, agora.
 *
 * Existe para o momento em que ela cola o endereço: esperar meia hora para
 * descobrir se colou certo faria qualquer pessoa desistir no meio.
 */
export const espelharGoogleAgora = onCall<{ url?: string }>(
  { region: "southamerica-east1", timeoutSeconds: 300 },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "É preciso estar logado.");

    const feed = await db.collection("calendarFeeds").doc(uid).get();
    const url = request.data?.url?.trim() || (feed.data()?.googleIcsUrl as string | undefined);
    if (!url) return { ok: false, erro: "Cole primeiro o endereço do seu Google Agenda." };
    if (!/^https:\/\/calendar\.google\.com\//.test(url)) {
      return {
        ok: false,
        erro: "Esse endereço não parece ser do Google Agenda. Copie o \"endereço secreto em formato iCal\" nas configurações do calendário.",
      };
    }

    try {
      const { total } = await espelhar(uid, url);
      await feed.ref.set({ googleIcsUrl: url, googleAtivo: true }, { merge: true });
      return { ok: true, total };
    } catch (erro) {
      const mensagem = String(erro).slice(0, 200);
      await feed.ref.set({ googleErro: mensagem }, { merge: true });
      return { ok: false, erro: `Não consegui ler esse calendário. ${mensagem}` };
    }
  }
);
