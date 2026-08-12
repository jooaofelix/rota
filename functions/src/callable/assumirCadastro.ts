import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../admin";

/**
 * Coleções onde o paciente aparece por id. Ao assumir o cadastro, o histórico
 * que a profissional já tinha precisa apontar para a conta nova — senão fica
 * partido em dois, e o pior é que ninguém percebe até faltar uma sessão no
 * relatório.
 */
const COLECOES_COM_PACIENTE = [
  "sessions",
  "sessionRecords",
  "referrals",
  "invoices",
  "routines",
  "routineItems",
  "completions",
  "rewards",
  "rewardAchievements",
  "emotionRecords",
  "reports",
  "messages",
];

/**
 * O paciente assume o cadastro que a profissional já tinha criado para ele.
 *
 * O caminho inverso do que existia: antes, a profissional pegava o código do
 * paciente já cadastrado. Agora ela cadastra primeiro — inclusive importando de
 * outro sistema — e entrega um código; quem chega depois é a conta.
 *
 * Roda no servidor porque envolve três coisas que o aplicativo não pode fazer:
 * procurar um cadastro por código sem poder ler a coleção inteira, mover o
 * histórico entre ids, e garantir que um código só seja usado uma vez.
 */
export const assumirCadastro = onCall<{ codigo: string }>(
  { region: "southamerica-east1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "É preciso estar logado.");

    const codigo = (request.data?.codigo ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (codigo.length !== 6) {
      return { ok: false, erro: "O código tem 6 letras e números. Confira com a sua profissional." };
    }

    const achados = await db.collection("patients").where("accessCode", "==", codigo).limit(2).get();
    if (achados.empty) {
      return { ok: false, erro: "Não achei esse código. Confira com a sua profissional." };
    }
    if (achados.size > 1) {
      // Não deveria acontecer; se acontecer, é melhor parar do que escolher errado.
      throw new HttpsError("internal", "Código ambíguo. Fale com a sua profissional.");
    }

    const antigo = achados.docs[0];
    const dados = antigo.data();
    const antigoId = antigo.id;

    if (dados.hasAccount) {
      return { ok: false, erro: "Este código já foi usado." };
    }
    if (antigoId === uid) {
      return { ok: true, jaEra: true };
    }

    const links = await db
      .collection("professionalPatientLinks")
      .where("patientId", "==", antigoId)
      .get();

    const lote = db.batch();

    // O cadastro passa a morar no id da conta, guardando de onde veio: se algum
    // dia sobrar referência antiga em algum lugar, dá para rastrear.
    lote.set(
      db.collection("patients").doc(uid),
      {
        ...dados,
        uid,
        hasAccount: true,
        accessCode: FieldValue.delete(),
        importedFrom: antigoId,
        claimedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    links.forEach((link) => {
      const professionalId = link.data().professionalId as string;
      lote.set(db.collection("professionalPatientLinks").doc(`${professionalId}_${uid}`), {
        professionalId,
        patientId: uid,
        status: link.data().status ?? "active",
        createdAt: link.data().createdAt ?? FieldValue.serverTimestamp(),
      });
      lote.delete(link.ref);
    });

    lote.delete(antigo.ref);
    await lote.commit();

    // O histórico vem depois do vínculo: se algo falhar no meio, a pessoa já
    // está ligada à profissional certa, e o resto é recuperável.
    let movidos = 0;
    for (const colecao of COLECOES_COM_PACIENTE) {
      let ultimo: FirebaseFirestore.QueryDocumentSnapshot | undefined;
      // Em páginas de 400: o limite de um lote do Firestore é 500 operações.
      for (;;) {
        let q = db.collection(colecao).where("patientId", "==", antigoId).limit(400);
        if (ultimo) q = q.startAfter(ultimo);
        const pagina = await q.get();
        if (pagina.empty) break;

        const b = db.batch();
        pagina.docs.forEach((d) => b.update(d.ref, { patientId: uid }));
        await b.commit();

        movidos += pagina.size;
        ultimo = pagina.docs[pagina.docs.length - 1];
        if (pagina.size < 400) break;
      }
    }

    return { ok: true, movidos };
  }
);
