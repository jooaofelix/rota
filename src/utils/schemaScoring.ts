import type { Questionario } from "@/data/schemaQuestionnaires";

export interface Apuracao {
  fatores?: Record<string, number>;
  fatoresPai?: Record<string, number>;
  media?: number;
}

/** Média de um conjunto de itens, ignorando o que não foi respondido. */
function media(respostas: number[], itens: number[]): number {
  const validos = itens.map((i) => respostas[i]).filter((v) => typeof v === "number" && v > 0);
  if (validos.length === 0) return 0;
  return Number((validos.reduce((a, b) => a + b, 0) / validos.length).toFixed(2));
}

/**
 * Apura como a planilha apurava: média dos itens do fator, e nada além disso.
 *
 * A tentação aqui seria "melhorar" — normalizar para 0–100, ponderar item, virar
 * percentil. Seria outro instrumento. Ela lê 1 a 6 e sabe o que 4,2 significa;
 * qualquer conversão obrigaria a reaprender a própria escala.
 */
export function apurar(q: Questionario, respostas: number[], respostasPai?: number[]): Apuracao {
  if (q.fatores.length === 0) {
    const todos = q.itens.map((_, i) => i);
    return { media: media(respostas, todos) };
  }

  const fatores: Record<string, number> = {};
  q.fatores.forEach((f) => {
    fatores[f.id] = media(respostas, f.itens);
  });

  if (!q.colunas || !respostasPai) return { fatores };

  const fatoresPai: Record<string, number> = {};
  q.fatores.forEach((f) => {
    fatoresPai[f.id] = media(respostasPai, f.itens);
  });
  return { fatores, fatoresPai };
}

/** Fatores acima do corte, do maior para o menor — a leitura que interessa primeiro. */
export function ativados(q: Questionario, fatores: Record<string, number> | undefined) {
  if (!fatores || q.corte === undefined) return [];
  return q.fatores
    .filter((f) => (fatores[f.id] ?? 0) >= q.corte!)
    .map((f) => ({ ...f, valor: fatores[f.id] }))
    .sort((a, b) => b.valor - a.valor);
}

/** Ordena todos os fatores pelo valor, para quando não há corte definido (YAMI). */
export function porIntensidade(q: Questionario, fatores: Record<string, number> | undefined) {
  if (!fatores) return [];
  return q.fatores.map((f) => ({ ...f, valor: fatores[f.id] ?? 0 })).sort((a, b) => b.valor - a.valor);
}

/** Da escala 1–6 para a largura da barra. */
export function largura(valor: number): number {
  return Math.max(0, Math.min(100, ((valor - 1) / 5) * 100));
}

export function linkDoQuestionario(token: string): string {
  return `${window.location.origin}/questionario/${token}`;
}

export function novoToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

/** Rascunho local: 186 itens não podem se perder porque a aba fechou. */
export const rascunhoKey = (token: string) => `rota:questionario:${token}`;
