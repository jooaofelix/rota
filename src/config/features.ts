/**
 * Partes do aplicativo que existem no código mas ainda não estão de pé.
 *
 * Uma tela que promete o que o sistema não entrega é pior que uma tela ausente:
 * a pessoa tenta, falha, e passa a duvidar do resto. Enquanto a emissão de nota
 * não tiver emissor contratado e função publicada, ela fica fora da vista.
 *
 * Para religar: voltar a exportar as funções em functions/src/index.ts, declarar
 * os segredos como o comentário de emitirNfse.ts explica, e trocar isto para true.
 */
export const NFSE_ATIVA = false;
