export { findPatientByEmail } from "./callable/findPatientByEmail";
// NFS-e desligada até haver emissor contratado. O código continua em
// callable/emitirNfse.ts e nfse/ — basta reexportar aqui para voltar a publicar.
// export { emitirNfse, consultarNfse, cancelarNfse } from "./callable/emitirNfse";
export { assumirCadastro } from "./callable/assumirCadastro";
export { excluirPacientes } from "./callable/excluirPacientes";
export { onNotificationCreate } from "./triggers/onNotificationCreate";
export { onCompletionCreate } from "./triggers/onCompletionCreate";
export { onAccountDeletionRequested } from "./triggers/onAccountDeletionRequested";
export { routineReminders, dailySummary } from "./scheduled/routineReminders";
export { morningSummary, afternoonSummary, eveningSummary } from "./scheduled/periodSummaries";
