import type { FaixaResultado, Instrumento, TomResultado } from "@/data/instruments";
import type { AssessmentDoc } from "@/types";

export interface Pontuacao {
  total?: number;
  fatores?: Record<string, number>;
  faixa?: string;
  tom?: TomResultado;
  risco?: boolean;
}

function limitesDaEscala(instrumento: Instrumento): { min: number; max: number } {
  const valores = (instrumento.escala ?? []).map((o) => o.valor);
  return { min: Math.min(...valores), max: Math.max(...valores) };
}

/** Item invertido pontua ao contrário: no 1–5, quem marcou 5 vale 1. */
function valorDoItem(instrumento: Instrumento, indice: number, resposta: number): number {
  const { min, max } = limitesDaEscala(instrumento);
  return instrumento.itens?.[indice]?.invertido ? max + min - resposta : resposta;
}

export function faixaDe(faixas: FaixaResultado[] | undefined, total: number): FaixaResultado | undefined {
  return faixas?.find((f) => total <= f.ate) ?? faixas?.[faixas.length - 1];
}

/**
 * Apura o resultado.
 *
 * Escala única vira soma bruta — é assim que PHQ-9 e GAD-7 são lidos, e trocar
 * por média inventaria um número que ninguém compara com a literatura. Perfil
 * vira posição de 0 a 100 dentro da escala, que é o que faz sentido comparar
 * entre fatores medidos com quantidades diferentes de itens.
 */
export function pontuar(instrumento: Instrumento, respostas: number[]): Pontuacao {
  const itens = instrumento.itens ?? [];

  if (instrumento.fatores?.length) {
    const { min, max } = limitesDaEscala(instrumento);
    const fatores: Record<string, number> = {};
    instrumento.fatores.forEach((f) => {
      const indices = itens.map((item, i) => (item.fator === f.id ? i : -1)).filter((i) => i >= 0);
      if (indices.length === 0) return;
      const media =
        indices.reduce((acc, i) => acc + valorDoItem(instrumento, i, respostas[i] ?? min), 0) / indices.length;
      fatores[f.id] = Math.round(((media - min) / (max - min)) * 100);
    });
    return { fatores };
  }

  const total = itens.reduce((acc, _item, i) => acc + valorDoItem(instrumento, i, respostas[i] ?? 0), 0);
  const faixa = faixaDe(instrumento.faixas, total);
  const risco =
    instrumento.itemDeRisco !== undefined && (respostas[instrumento.itemDeRisco.indice] ?? 0) > 0;

  return { total, faixa: faixa?.rotulo, tom: risco ? "alerta" : faixa?.tom, risco };
}

/** Escore em escala conhecida: o WHO-5 é lido de 0 a 100, não de 0 a 25. */
export function escoreApresentado(instrumento: Instrumento, total: number): { valor: number; de: number } {
  if (instrumento.id === "who5") return { valor: total * 4, de: 100 };
  const { max } = limitesDaEscala(instrumento);
  return { valor: total, de: max * (instrumento.itens?.length ?? 0) };
}

export const CORES_TOM: Record<TomResultado, { fundo: string; texto: string }> = {
  ok: { fundo: "bg-emerald-50", texto: "text-emerald-700" },
  atencao: { fundo: "bg-amber-50", texto: "text-amber-700" },
  alerta: { fundo: "bg-rose-50", texto: "text-rose-700" },
};

/**
 * Diferença para a aplicação anterior do mesmo instrumento.
 *
 * É o motivo de reaplicar: um PHQ-9 de 14 diz pouco sozinho, mas 22 → 14 diz
 * que alguma coisa está funcionando.
 */
export function variacao(
  historico: AssessmentDoc[],
  atual: AssessmentDoc
): { anterior: number; delta: number } | null {
  if (atual.total === undefined) return null;
  const mesmos = historico
    .filter((a) => a.instrumentId === atual.instrumentId && a.status === "respondido" && a.total !== undefined)
    .sort((a, b) => (a.answeredAt?.toMillis?.() ?? 0) - (b.answeredAt?.toMillis?.() ?? 0));
  const posicao = mesmos.findIndex((a) => a.id === atual.id);
  if (posicao <= 0) return null;
  const anterior = mesmos[posicao - 1].total!;
  return { anterior, delta: atual.total - anterior };
}

export function assessmentLink(token: string): string {
  return `${window.location.origin}/teste/${token}`;
}

export function novoTokenDeTeste(): string {
  return crypto.randomUUID().replace(/-/g, "");
}
