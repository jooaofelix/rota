/**
 * Leitura da lista de pacientes exportada de outro sistema.
 *
 * CSV e não XLSX de propósito: ler planilha no navegador exige uma biblioteca de
 * quase um megabyte, que todo paciente baixaria para sempre por causa de uma
 * importação que a profissional faz uma vez. "Salvar como CSV" é um clique no
 * Excel e não custa nada a ninguém.
 */

/** Como o outro sistema classificava o paciente no momento da exportação. */
export type SituacaoImportada = "ativo" | "encerrado" | "desconhecido";

export interface PacienteImportado {
  nome: string;
  situacao: SituacaoImportada;
  /** Texto original do status, para ela reconhecer o que veio da planilha. */
  situacaoTexto?: string;
  email?: string;
  telefone?: string;
  cpf?: string;
  nascimento?: Date;
  valorSessao?: number;
  /** Linha original, para ela conferir o que veio quando algo parecer errado. */
  linha: number;
  /** O mesmo nome já apareceu numa linha anterior deste arquivo. */
  repetidoNoArquivo?: boolean;
}

/** Cabeçalhos aceitos por campo. Comparação sem acento, sem caixa e sem pontuação. */
const COLUNAS: Record<CampoLido, string[]> = {
  nome: ["nome completo", "nome", "paciente", "cliente", "nome do paciente"],
  email: ["e mail", "email", "e-mail"],
  telefone: ["telefone celular", "celular", "telefone", "whatsapp", "telefone fixo"],
  cpf: ["cpf", "documento"],
  nascimento: ["data de nascimento", "nascimento", "data nascimento", "aniversario"],
  valorSessao: ["valor da sessao mensalidade", "valor da sessao", "valor", "valor sessao"],
  situacaoTexto: ["status", "situacao"],
};

type CampoLido = "nome" | "email" | "telefone" | "cpf" | "nascimento" | "valorSessao" | "situacaoTexto";

/**
 * "Alta" e "Desistência" não são erro nem sucesso — são fim de acompanhamento.
 * Entram como encerrados para ela poder deixar de fora sem precisar reconhecer
 * cada nome, que é o que aconteceria numa lista de oitenta e sete.
 */
function lerSituacao(valor: string | undefined): SituacaoImportada {
  const v = normalizar(valor ?? "");
  if (!v || v === "-") return "desconhecido";
  if (v === "ativo" || v === "ativa" || v === "em atendimento") return "ativo";
  return "encerrado";
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Divide uma linha de CSV respeitando aspas.
 *
 * Endereço com vírgula dentro é a regra, não a exceção, nessas exportações —
 * `split(",")` partiria o registro no meio e a importação entraria torta.
 */
function dividirLinha(linha: string, separador: string): string[] {
  const campos: string[] = [];
  let atual = "";
  let dentroDeAspas = false;

  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      if (dentroDeAspas && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else {
        dentroDeAspas = !dentroDeAspas;
      }
    } else if (c === separador && !dentroDeAspas) {
      campos.push(atual);
      atual = "";
    } else {
      atual += c;
    }
  }
  campos.push(atual);
  return campos.map((c) => c.trim());
}

/** Excel brasileiro exporta com ponto e vírgula; o resto do mundo, com vírgula. */
function detectarSeparador(cabecalho: string): string {
  return (cabecalho.match(/;/g)?.length ?? 0) > (cabecalho.match(/,/g)?.length ?? 0) ? ";" : ",";
}

/** "-" e vazio significam a mesma coisa nesses exports: campo não preenchido. */
function limpar(valor: string | undefined): string | undefined {
  const v = (valor ?? "").trim();
  return !v || v === "-" ? undefined : v;
}

function lerData(valor: string | undefined): Date | undefined {
  const v = limpar(valor);
  if (!v) return undefined;
  const br = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    const d = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return undefined;
}

/** "1.200,50" -> 1200.5 e "90,00" -> 90. */
function lerValor(valor: string | undefined): number | undefined {
  const v = limpar(valor);
  if (!v) return undefined;
  const numero = Number(v.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(numero) && numero > 0 ? numero : undefined;
}

export interface ResultadoLeitura {
  pacientes: PacienteImportado[];
  /** Cabeçalhos que a planilha tinha e nós ignoramos, para ela saber o que ficou de fora. */
  colunasIgnoradas: string[];
  /** Linhas descartadas por não terem nome — com o número, para ela achar na planilha. */
  linhasSemNome: number[];
  erro?: string;
}

export function lerCsvDePacientes(conteudo: string): ResultadoLeitura {
  const linhas = conteudo.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (linhas.length < 2) {
    return { pacientes: [], colunasIgnoradas: [], linhasSemNome: [], erro: "O arquivo não tem linhas de dados." };
  }

  const separador = detectarSeparador(linhas[0]);
  const cabecalhos = dividirLinha(linhas[0], separador).map(normalizar);

  const indices: Partial<Record<CampoLido, number>> = {};
  const usados = new Set<number>();
  (Object.keys(COLUNAS) as Array<keyof typeof COLUNAS>).forEach((campo) => {
    for (const aceito of COLUNAS[campo]) {
      const i = cabecalhos.findIndex((h, idx) => h === aceito && !usados.has(idx));
      if (i >= 0) {
        indices[campo] = i;
        usados.add(i);
        return;
      }
    }
  });

  if (indices.nome === undefined) {
    return {
      pacientes: [],
      colunasIgnoradas: [],
      linhasSemNome: [],
      erro: "Não achei a coluna com o nome do paciente. A planilha precisa ter uma coluna chamada \"Nome\" ou \"Nome Completo\".",
    };
  }

  const pacientes: PacienteImportado[] = [];
  const linhasSemNome: number[] = [];
  // Exportação de outro sistema repete gente: a mesma pessoa em duas unidades, ou
  // duas linhas porque mudou de plano. Marcar aqui evita cadastrar duas vezes.
  const nomesVistos = new Set<string>();

  for (let i = 1; i < linhas.length; i++) {
    const campos = dividirLinha(linhas[i], separador);
    const nome = limpar(campos[indices.nome!]);
    if (!nome) {
      linhasSemNome.push(i + 1);
      continue;
    }
    const chave = normalizar(nome);
    const repetidoNoArquivo = nomesVistos.has(chave);
    nomesVistos.add(chave);
    const situacaoTexto = indices.situacaoTexto !== undefined ? limpar(campos[indices.situacaoTexto]) : undefined;
    pacientes.push({
      nome,
      repetidoNoArquivo,
      situacao: lerSituacao(situacaoTexto),
      situacaoTexto,
      email: indices.email !== undefined ? limpar(campos[indices.email]) : undefined,
      telefone: indices.telefone !== undefined ? limpar(campos[indices.telefone]) : undefined,
      cpf: indices.cpf !== undefined ? limpar(campos[indices.cpf]) : undefined,
      nascimento: indices.nascimento !== undefined ? lerData(campos[indices.nascimento]) : undefined,
      valorSessao: indices.valorSessao !== undefined ? lerValor(campos[indices.valorSessao]) : undefined,
      linha: i + 1,
    });
  }

  const colunasIgnoradas = dividirLinha(linhas[0], separador).filter((_, idx) => !usados.has(idx));

  return { pacientes, colunasIgnoradas, linhasSemNome };
}

/** Nomes iguais depois de normalizar contam como o mesmo paciente. */
export function jaExiste(nome: string, existentes: string[]): boolean {
  const alvo = normalizar(nome);
  return existentes.some((e) => normalizar(e) === alvo);
}
