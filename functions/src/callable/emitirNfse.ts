import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../admin";
import { restProvider } from "../nfse/restProvider";
import type { NfseProvider } from "../nfse/provider";

const NFSE_BASE_URL = defineSecret("NFSE_BASE_URL");
const NFSE_TOKEN = defineSecret("NFSE_TOKEN");

function provedor(): NfseProvider {
  const base = NFSE_BASE_URL.value();
  const token = NFSE_TOKEN.value();
  if (!base || !token) {
    throw new HttpsError(
      "failed-precondition",
      "A emissão ainda não está configurada. Falta cadastrar o emissor e o certificado."
    );
  }
  return restProvider(base, token, "emissor");
}

async function garantirProfissional(uid: string | undefined) {
  if (!uid) throw new HttpsError("unauthenticated", "É preciso estar autenticado.");
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists || snap.data()?.role !== "professional") {
    throw new HttpsError("permission-denied", "Apenas a profissional emite notas.");
  }
}

/**
 * Emite a NFS-e de uma nota já rascunhada.
 *
 * Roda aqui, e não no aplicativo, porque a chave do emissor e o certificado
 * digital não podem existir no navegador: quem abrisse o app teria como emitir
 * nota em nome dela.
 *
 * A trava de duplicidade é o estado do próprio documento. Nota emitida duas
 * vezes é problema fiscal, não incômodo de tela — e o toque repetido no botão,
 * numa conexão ruim, é justamente o caso mais provável.
 */
export const emitirNfse = onCall<{ invoiceId: string }>(
  { secrets: [NFSE_BASE_URL, NFSE_TOKEN], region: "southamerica-east1" },
  async (request) => {
    await garantirProfissional(request.auth?.uid);
    const uid = request.auth!.uid;

    const invoiceId = request.data?.invoiceId;
    if (!invoiceId) throw new HttpsError("invalid-argument", "Informe a nota.");

    const ref = db.collection("invoices").doc(invoiceId);

    // Transação: só um pedido sai do rascunho, mesmo com dois toques ao mesmo tempo.
    const nota = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new HttpsError("not-found", "Nota não encontrada.");
      const dados = snap.data() as Record<string, unknown>;
      if (dados.professionalId !== uid) {
        throw new HttpsError("permission-denied", "Esta nota não é sua.");
      }
      if (dados.status === "emitida") {
        throw new HttpsError("failed-precondition", "Esta nota já foi emitida.");
      }
      if (dados.status === "enviando") {
        throw new HttpsError("failed-precondition", "Esta nota já está sendo emitida. Aguarde a resposta.");
      }
      tx.update(ref, { status: "enviando", erro: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() });
      return dados;
    });

    const fiscalSnap = await db.collection("fiscalProfiles").doc(uid).get();
    const fiscal = fiscalSnap.data() as Record<string, any> | undefined;

    const faltando: string[] = [];
    if (!fiscal?.cnpj) faltando.push("CNPJ");
    if (!fiscal?.inscricaoMunicipal) faltando.push("inscrição municipal");
    if (!fiscal?.codigoServico) faltando.push("código do serviço");
    if (faltando.length) {
      await ref.update({
        status: "erro",
        erro: `Falta no cadastro fiscal: ${faltando.join(", ")}.`,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { ok: false, erro: `Falta no cadastro fiscal: ${faltando.join(", ")}.` };
    }

    try {
      const saida = await provedor().emitir({
        referencia: invoiceId,
        prestador: {
          cnpj: String(fiscal!.cnpj),
          inscricaoMunicipal: String(fiscal!.inscricaoMunicipal),
          codigoMunicipio: fiscal!.codigoMunicipio ? String(fiscal!.codigoMunicipio) : undefined,
          regimeSimples: fiscal!.regime === "pj_simples" || fiscal!.regime === "mei",
        },
        tomador: {
          nome: String(nota.patientName ?? ""),
          cpf: nota.patientCpf ? String(nota.patientCpf) : undefined,
          email: nota.patientEmail ? String(nota.patientEmail) : undefined,
        },
        servico: {
          descricao: String(nota.description ?? "Atendimento psicológico"),
          valor: Number(nota.value ?? 0),
          codigoServico: String(fiscal!.codigoServico),
          issAliquota: fiscal!.issAliquota ? Number(fiscal!.issAliquota) : undefined,
          competencia: String(nota.competencia ?? "").slice(0, 10),
        },
      });

      if (saida.erro) {
        await ref.update({
          status: "erro",
          erro: saida.erro,
          providerRef: saida.providerRef ?? null,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { ok: false, erro: saida.erro };
      }

      await ref.update({
        // Continua "enviando" enquanto a prefeitura não devolve o número:
        // dizer "emitida" antes disso seria mentira em cima de dado fiscal.
        status: saida.processando ? "enviando" : "emitida",
        numero: saida.numero ?? null,
        chaveAcesso: saida.chaveAcesso ?? null,
        linkPdf: saida.linkPdf ?? null,
        linkXml: saida.linkXml ?? null,
        providerRef: saida.providerRef ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { ok: true };
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : "Falha ao falar com o emissor.";
      // Volta para rascunho: falha de rede não gerou nota, e ela precisa poder tentar de novo.
      await ref.update({ status: "rascunho", erro: mensagem, updatedAt: FieldValue.serverTimestamp() });
      return { ok: false, erro: mensagem };
    }
  }
);

/** Consulta o emissor e atualiza a nota que ficou em processamento. */
export const consultarNfse = onCall<{ invoiceId: string }>(
  { secrets: [NFSE_BASE_URL, NFSE_TOKEN], region: "southamerica-east1" },
  async (request) => {
    await garantirProfissional(request.auth?.uid);
    const ref = db.collection("invoices").doc(request.data?.invoiceId ?? "");
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.professionalId !== request.auth!.uid) {
      throw new HttpsError("not-found", "Nota não encontrada.");
    }
    const providerRef = snap.data()?.providerRef;
    if (!providerRef) return { ok: false, erro: "Esta nota ainda não foi enviada." };

    const saida = await provedor().consultar(String(providerRef));
    await ref.update({
      status: saida.erro ? "erro" : saida.processando ? "enviando" : "emitida",
      erro: saida.erro ?? null,
      numero: saida.numero ?? snap.data()?.numero ?? null,
      chaveAcesso: saida.chaveAcesso ?? snap.data()?.chaveAcesso ?? null,
      linkPdf: saida.linkPdf ?? snap.data()?.linkPdf ?? null,
      linkXml: saida.linkXml ?? snap.data()?.linkXml ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { ok: !saida.erro, erro: saida.erro };
  }
);

export const cancelarNfse = onCall<{ invoiceId: string; motivo: string }>(
  { secrets: [NFSE_BASE_URL, NFSE_TOKEN], region: "southamerica-east1" },
  async (request) => {
    await garantirProfissional(request.auth?.uid);
    const ref = db.collection("invoices").doc(request.data?.invoiceId ?? "");
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.professionalId !== request.auth!.uid) {
      throw new HttpsError("not-found", "Nota não encontrada.");
    }
    const providerRef = snap.data()?.providerRef;
    if (!providerRef) return { ok: false, erro: "Esta nota não chegou a ser emitida." };

    const motivo = (request.data?.motivo ?? "").trim();
    if (motivo.length < 15) {
      return { ok: false, erro: "A prefeitura exige uma justificativa com pelo menos 15 caracteres." };
    }

    const resultado = await provedor().cancelar(String(providerRef), motivo);
    if (resultado.ok) {
      await ref.update({ status: "cancelada", erro: null, updatedAt: FieldValue.serverTimestamp() });
    }
    return resultado;
  }
);
