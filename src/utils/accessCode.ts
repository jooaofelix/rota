/**
 * Código que a profissional entrega ao paciente para ele assumir o cadastro.
 *
 * Seis caracteres, sem I, O, 0 e 1: esse código vai ser ditado por telefone e
 * escrito num papel na recepção, e "I" contra "1" é o erro clássico de quem lê
 * em voz alta. Trinta e dois símbolos em seis casas dão mais de um bilhão de
 * combinações, o que basta de sobra para um consultório.
 */
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function novoCodigoDeAcesso(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join("");
}

/** Aceita como o paciente digita: minúsculo, com espaço, com hífen. */
export function normalizarCodigo(bruto: string): string {
  return bruto.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Exibido em dois blocos de três, que é como se lê em voz alta. */
export function formatarCodigo(codigo: string): string {
  return codigo.length === 6 ? `${codigo.slice(0, 3)}-${codigo.slice(3)}` : codigo;
}
