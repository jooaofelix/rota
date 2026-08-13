import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../admin";

/**
 * Tudo que fica pendurado num paciente por id. Apagar o cadastro e deixar isto
 * para trás produz sessão sem dono na agenda e cobrança sem nome nas finanças —
 * lixo que ninguém encontra depois porque não aparece em lista nenhuma.
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
  "assessments",
];

const LIMITE_POR_CHAMADA = 50;

async function apagarPorPaciente(colecao: string, patientId: string): Promise<number> {
  let apagados = 0;
  for (;;) {
    // Em páginas de 400: o limite de um lote do Firestore é 500 operações.
    const pagina = await db.collection(colecao).where("patientId", "==", patientId).limit(400).get();
    if (pagina.empty) break;
    const lote = db.batch();
    pagina.docs.forEach((d) => lote.delete(d.ref));
    await lote.commit();
    apagados += pagina.size;
    if (pagina.size < 400) break;
  }
  return apagados;
}

/**
 * Exclui cadastros de paciente.
 *
 * Roda no servidor por dois motivos. O primeiro é que apagar é uma varredura por
 * doze coleções, e as regras do Firestore proibiam exclusão em quase todas — de
 * propósito, para que nada suma por acidente do aplicativo. O segundo é que aqui
 * dá para separar dois casos que não podem ser tratados igual:
 *
 * - cadastro que ela criou (importado ou digitado): some inteiro, com histórico;
 * - paciente com conta própria: a conta é da pessoa, não dela. Nesse caso o que
 *   acontece é desvínculo — sai da lista dela e ela perde o acesso, mas o app do
 *   paciente e os dados dele continuam existindo.
 */
export const excluirPacientes = onCall<{ patientIds: string[] }>(
  // Uma limpeza de lista inteira são dezenas de pacientes vezes treze coleções.
  // No minuto padrão isso não cabe: o tempo vai para a ida e volta de cada
  // consulta, não para o processamento.
  { region: "southamerica-east1", timeoutSeconds: 540 },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "É preciso estar logado.");

    const perfil = await db.collection("users").doc(uid).get();
    if (perfil.data()?.role !== "professional") {
      throw new HttpsError("permission-denied", "Só a profissional exclui cadastro.");
    }

    const ids = Array.from(new Set(request.data?.patientIds ?? [])).filter(Boolean);
    if (ids.length === 0) return { excluidos: 0, desvinculados: 0, erros: [] as string[] };
    if (ids.length > LIMITE_POR_CHAMADA) {
      throw new HttpsError("invalid-argument", `No máximo ${LIMITE_POR_CHAMADA} por vez.`);
    }

    let excluidos = 0;
    let desvinculados = 0;
    const erros: string[] = [];

    for (const patientId of ids) {
      const linkRef = db.collection("professionalPatientLinks").doc(`${uid}_${patientId}`);
      const link = await linkRef.get();
      if (!link.exists || link.data()?.status !== "active") {
        erros.push(patientId);
        continue;
      }

      const pacienteRef = db.collection("patients").doc(patientId);
      const paciente = await pacienteRef.get();
      const conta = await db.collection("users").doc(patientId).get();
      const temConta = conta.exists || paciente.data()?.hasAccount === true;

      if (temConta) {
        // Não é dela para apagar: encerra o vínculo e para por aí.
        await linkRef.update({ status: "ended", endedAt: new Date() });
        desvinculados++;
        continue;
      }

      // As treze coleções em paralelo: são independentes entre si, e em série o
      // custo é doze idas ao banco por paciente só para descobrir que a maioria
      // está vazia — que é o caso de quem veio de importação.
      await Promise.all(COLECOES_COM_PACIENTE.map((colecao) => apagarPorPaciente(colecao, patientId)));
      await pacienteRef.delete();
      await linkRef.delete();
      excluidos++;
    }

    return { excluidos, desvinculados, erros };
  }
);
