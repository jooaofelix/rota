/**
 * Leitura de um arquivo .ics exportado do Google Agenda.
 *
 * Serve à mudança de casa: ela vem usando o Google, exporta o calendário e traz
 * os atendimentos para cá de uma vez. Depois disso o ROTA passa a ser a fonte, e
 * este código não roda mais — por isso ele é generoso na leitura e desconfiado
 * na conclusão: quando não tem certeza do que uma regra de repetição significa,
 * ele avisa em vez de inventar horário na agenda de alguém.
 */

export interface EventoImportado {
  /** Identificador do evento no arquivo, para agrupar as repetições. */
  uid: string;
  titulo: string;
  descricao?: string;
  local?: string;
  /** YYYY-MM-DD no fuso local. */
  data: string;
  /** HH:mm. Vazio em evento de dia inteiro. */
  inicio: string;
  fim: string;
  diaInteiro: boolean;
  /** Veio de uma regra de repetição expandida aqui. */
  repetido: boolean;
}

export interface ResultadoIcs {
  eventos: EventoImportado[];
  /** Repetições que eu não soube expandir com segurança — ela decide na mão. */
  naoInterpretados: string[];
  erro?: string;
}

/** Desdobra as linhas continuadas: o formato quebra em 75 colunas. */
function juntarLinhas(texto: string): string[] {
  const cruas = texto.replace(/\r\n/g, "\n").split("\n");
  const linhas: string[] = [];
  cruas.forEach((l) => {
    if ((l.startsWith(" ") || l.startsWith("\t")) && linhas.length > 0) {
      linhas[linhas.length - 1] += l.slice(1);
    } else {
      linhas.push(l);
    }
  });
  return linhas;
}

function desescapar(v: string): string {
  return v.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

const doisDigitos = (n: number) => String(n).padStart(2, "0");
const chaveLocal = (d: Date) =>
  `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
const horaLocal = (d: Date) => `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;

/**
 * Converte o valor de data do arquivo para um instante.
 *
 * Três formatos aparecem na prática: com fuso declarado, em UTC (terminado em Z)
 * e só data. O terceiro é evento de dia inteiro.
 *
 * O horário com TZID é lido como se fosse local. Isso é exato quando o
 * calendário está no mesmo fuso do computador dela — que é o caso da migração —
 * e evitar a conversão completa aqui poupa embutir a tabela de fusos inteira num
 * aplicativo que roda no celular.
 */
function lerData(parametros: string, valor: string): { data: Date; diaInteiro: boolean } | null {
  const soData = /^(\d{4})(\d{2})(\d{2})$/.exec(valor);
  if (soData) {
    return {
      data: new Date(Number(soData[1]), Number(soData[2]) - 1, Number(soData[3])),
      diaInteiro: true,
    };
  }

  const completo = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(valor);
  if (!completo) return null;

  const [, a, m, d, h, min, s, zulu] = completo;
  if (zulu) {
    // UTC: o navegador devolve o horário local dela, que é o que a agenda usa.
    return { data: new Date(Date.UTC(+a, +m - 1, +d, +h, +min, +s)), diaInteiro: false };
  }
  void parametros;
  return { data: new Date(+a, +m - 1, +d, +h, +min, +s), diaInteiro: false };
}

interface Bruto {
  uid: string;
  titulo: string;
  descricao?: string;
  local?: string;
  inicio: Date;
  fim: Date;
  diaInteiro: boolean;
  rrule?: string;
  exdatas: string[];
  cancelado: boolean;
  recorrenciaDe?: string;
}

/**
 * Expande a regra de repetição dentro da janela pedida.
 *
 * Cobre o que aparece numa agenda de consultório: toda semana, de quinze em
 * quinze dias, todo dia, todo mês, com fim por data ou por quantidade. O que
 * fugir disso volta como não interpretado — melhor ela marcar seis sessões na
 * mão do que descobrir em novembro que o sistema inventou trinta.
 */
function expandir(
  bruto: Bruto,
  de: Date,
  ate: Date
): { datas: Date[]; entendida: boolean } {
  if (!bruto.rrule) return { datas: [bruto.inicio], entendida: true };

  const partes = Object.fromEntries(
    bruto.rrule.split(";").map((p) => {
      const [k, v] = p.split("=");
      return [k.toUpperCase(), v];
    })
  ) as Record<string, string>;

  const freq = partes.FREQ;
  const intervalo = Number(partes.INTERVAL ?? 1) || 1;
  const contagem = partes.COUNT ? Number(partes.COUNT) : undefined;
  const limite = partes.UNTIL ? lerData("", partes.UNTIL)?.data : undefined;

  // BYDAY com vários dias ("toda terça e quinta") é comum e não é difícil, mas
  // muda a contagem de intervalo; fora do escopo da migração.
  const simples = ["DAILY", "WEEKLY", "MONTHLY"].includes(freq) && !partes.BYDAY?.includes(",") && !partes.BYSETPOS;
  if (!simples) return { datas: [], entendida: false };

  const passo = (d: Date) => {
    const proximo = new Date(d);
    if (freq === "DAILY") proximo.setDate(proximo.getDate() + intervalo);
    else if (freq === "WEEKLY") proximo.setDate(proximo.getDate() + 7 * intervalo);
    else proximo.setMonth(proximo.getMonth() + intervalo);
    return proximo;
  };

  const datas: Date[] = [];
  let atual = new Date(bruto.inicio);
  let geradas = 0;
  let voltas = 0;
  // COUNT conta o que a regra gera, e não o que sobra depois das exceções: numa
  // série de seis com uma cancelada, o certo são cinco sessões, não seis.
  // O teto de voltas é rede de segurança — regra sem fim não pode virar laço eterno.
  while (atual <= ate && voltas < 400 && (!contagem || geradas < contagem)) {
    if (limite && atual > limite) break;
    geradas++;
    const chave = chaveLocal(atual);
    if (atual >= de && !bruto.exdatas.includes(chave)) datas.push(new Date(atual));
    atual = passo(atual);
    voltas++;
  }

  return { datas, entendida: true };
}

export function lerIcsDeAgenda(conteudo: string, de: string, ate: string): ResultadoIcs {
  if (!conteudo.includes("BEGIN:VCALENDAR")) {
    return {
      eventos: [],
      naoInterpretados: [],
      erro: "Esse arquivo não parece um calendário. No Google Agenda, use Configurações › Importar e exportar › Exportar, e escolha o arquivo .ics de dentro do .zip.",
    };
  }

  const linhas = juntarLinhas(conteudo);
  const brutos: Bruto[] = [];
  let atual: Partial<Bruto> | null = null;

  linhas.forEach((linha) => {
    if (linha.startsWith("BEGIN:VEVENT")) {
      atual = { exdatas: [], cancelado: false };
      return;
    }
    if (linha.startsWith("END:VEVENT")) {
      if (atual?.uid && atual.inicio && atual.titulo) brutos.push(atual as Bruto);
      atual = null;
      return;
    }
    if (!atual) return;

    const divisor = linha.indexOf(":");
    if (divisor < 0) return;
    const esquerda = linha.slice(0, divisor);
    const valor = linha.slice(divisor + 1);
    const [nome, ...params] = esquerda.split(";");
    const parametros = params.join(";");

    switch (nome.toUpperCase()) {
      case "UID":
        atual.uid = valor;
        break;
      case "SUMMARY":
        atual.titulo = desescapar(valor).trim();
        break;
      case "DESCRIPTION":
        atual.descricao = desescapar(valor).trim();
        break;
      case "LOCATION":
        atual.local = desescapar(valor).trim();
        break;
      case "DTSTART": {
        const lido = lerData(parametros, valor);
        if (lido) {
          atual.inicio = lido.data;
          atual.diaInteiro = lido.diaInteiro;
        }
        break;
      }
      case "DTEND": {
        const lido = lerData(parametros, valor);
        if (lido) atual.fim = lido.data;
        break;
      }
      case "RRULE":
        atual.rrule = valor;
        break;
      case "EXDATE":
        valor.split(",").forEach((v) => {
          const lido = lerData(parametros, v.trim());
          if (lido) atual!.exdatas!.push(chaveLocal(lido.data));
        });
        break;
      case "STATUS":
        atual.cancelado = valor.toUpperCase() === "CANCELLED";
        break;
      case "RECURRENCE-ID":
        atual.recorrenciaDe = valor;
        break;
    }
  });

  const inicioJanela = new Date(`${de}T00:00:00`);
  const fimJanela = new Date(`${ate}T23:59:59`);
  const eventos: EventoImportado[] = [];
  const naoInterpretados: string[] = [];

  brutos
    .filter((b) => !b.cancelado)
    .forEach((b) => {
      const duracaoMin = b.fim ? Math.max(0, (b.fim.getTime() - b.inicio.getTime()) / 60000) : 50;
      const { datas, entendida } = expandir(b, inicioJanela, fimJanela);

      if (!entendida) {
        naoInterpretados.push(b.titulo);
        return;
      }

      datas
        .filter((d) => d >= inicioJanela && d <= fimJanela)
        .forEach((d) => {
          const fim = new Date(d.getTime() + duracaoMin * 60000);
          eventos.push({
            uid: b.uid,
            titulo: b.titulo,
            descricao: b.descricao,
            local: b.local,
            data: chaveLocal(d),
            inicio: b.diaInteiro ? "" : horaLocal(d),
            fim: b.diaInteiro ? "" : horaLocal(fim),
            diaInteiro: b.diaInteiro,
            repetido: !!b.rrule,
          });
        });
    });

  eventos.sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio));
  return { eventos, naoInterpretados: [...new Set(naoInterpretados)] };
}

/** Normaliza para comparar título de evento com nome de paciente. */
export function normalizarNome(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tenta adivinhar de quem é o evento pelo título.
 *
 * "Ana Beatriz", "Sessão Ana Beatriz" e "Ana Beatriz - online" são a mesma
 * pessoa. Adivinhar poupa dezenas de escolhas, mas nunca decide sozinho: o
 * palpite chega marcado na tela, para ela confirmar de relance.
 */
/** Enfeites que a gente escreve na agenda e não fazem parte do nome de ninguém. */
const RUIDO = new Set([
  "sessao", "sessão", "atendimento", "consulta", "terapia", "psicoterapia",
  "online", "presencial", "consultorio", "retorno", "avaliacao", "psi",
  "dr", "dra", "sr", "sra", "de", "da", "do", "com", "e",
]);

const semRuido = (texto: string) =>
  normalizarNome(texto).split(" ").filter((p) => p && !RUIDO.has(p));

export function palpitarPaciente(
  titulo: string,
  pacientes: Array<{ id: string; name: string }>
): string | undefined {
  const palavras = semRuido(titulo);
  if (palavras.length === 0) return undefined;
  const t = palavras.join(" ");

  const exato = pacientes.find((p) => semRuido(p.name).join(" ") === t);
  if (exato) return exato.id;

  const contido = pacientes.find((p) => {
    const n = semRuido(p.name).join(" ");
    return n.length >= 6 && (t.includes(n) || n.includes(t));
  });
  if (contido) return contido.id;

  // "Sessão Pedro Henrique - online" e "Pedro Henrique Lima" são a mesma pessoa:
  // dois pedaços do nome batendo já bastam, e só um não — "Ana" sozinha pode
  // ser três pacientes diferentes.
  const doisPedacos = pacientes.filter((p) => {
    const partes = semRuido(p.name);
    if (partes.length < 2) return false;
    return partes.filter((parte) => palavras.includes(parte)).length >= 2;
  });
  return doisPedacos.length === 1 ? doisPedacos[0].id : undefined;
}
