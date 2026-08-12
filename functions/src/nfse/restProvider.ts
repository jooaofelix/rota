import type { EmitirEntrada, EmitirSaida, NfseProvider } from "./provider";

/**
 * Emissor genérico por REST.
 *
 * Os emissores do mercado (Focus NFe, PlugNotas, Nuvem Fiscal e afins) expõem a
 * mesma forma: POST com JSON, token no cabeçalho, resposta com o número e os
 * links do PDF e do XML. O que muda entre eles são os nomes dos campos.
 *
 * ATENÇÃO — o mapa de campos abaixo (`montarCorpo` e `lerResposta`) é o único
 * ponto que precisa ser conferido contra a documentação do emissor contratado
 * antes de emitir de verdade. O resto do fluxo — autenticação, idempotência,
 * estados, erro — não depende de qual foi escolhido.
 */
export function restProvider(baseUrl: string, token: string, nome: string): NfseProvider {
  async function chamar(caminho: string, init: RequestInit): Promise<{ status: number; corpo: any }> {
    const resposta = await fetch(`${baseUrl.replace(/\/$/, "")}${caminho}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });
    const texto = await resposta.text();
    let corpo: any = {};
    try {
      corpo = texto ? JSON.parse(texto) : {};
    } catch {
      corpo = { mensagem: texto };
    }
    return { status: resposta.status, corpo };
  }

  /** Campos do padrão nacional. Confira os nomes na documentação do emissor. */
  function montarCorpo(e: EmitirEntrada) {
    return {
      referencia: e.referencia,
      prestador: {
        cnpj: somenteDigitos(e.prestador.cnpj),
        inscricao_municipal: e.prestador.inscricaoMunicipal,
        codigo_municipio: e.prestador.codigoMunicipio,
        optante_simples_nacional: e.prestador.regimeSimples,
      },
      tomador: {
        razao_social: e.tomador.nome,
        cpf: e.tomador.cpf ? somenteDigitos(e.tomador.cpf) : undefined,
        email: e.tomador.email,
      },
      servico: {
        discriminacao: e.servico.descricao,
        valor_servicos: e.servico.valor,
        item_lista_servico: e.servico.codigoServico,
        aliquota: e.servico.issAliquota,
        // Padrão nacional: quem é do Simples não destaca ISS na nota.
        iss_retido: false,
      },
      data_emissao: e.servico.competencia,
    };
  }

  function lerResposta(corpo: any): EmitirSaida {
    const situacao = String(corpo?.status ?? corpo?.situacao ?? "").toLowerCase();
    if (situacao.includes("process") || situacao.includes("andamento") || situacao === "pendente") {
      return { processando: true, providerRef: corpo?.ref ?? corpo?.id };
    }
    if (situacao.includes("erro") || situacao.includes("rejeit") || situacao.includes("cancel")) {
      return {
        processando: false,
        erro: corpo?.mensagem ?? corpo?.erro ?? corpo?.message ?? "O emissor recusou a nota.",
        providerRef: corpo?.ref ?? corpo?.id,
      };
    }
    return {
      processando: false,
      numero: corpo?.numero ?? corpo?.numero_nfse,
      chaveAcesso: corpo?.chave_acesso ?? corpo?.codigo_verificacao,
      linkPdf: corpo?.url_danfse ?? corpo?.caminho_danfse ?? corpo?.pdf,
      linkXml: corpo?.url_xml ?? corpo?.caminho_xml_nota_fiscal ?? corpo?.xml,
      providerRef: corpo?.ref ?? corpo?.id,
    };
  }

  return {
    nome,

    async emitir(entrada) {
      const { status, corpo } = await chamar("/nfse", {
        method: "POST",
        body: JSON.stringify(montarCorpo(entrada)),
      });
      if (status >= 400) {
        return {
          processando: false,
          erro: corpo?.mensagem ?? corpo?.erro ?? `O emissor respondeu ${status}.`,
        };
      }
      return lerResposta(corpo);
    },

    async consultar(providerRef) {
      const { status, corpo } = await chamar(`/nfse/${encodeURIComponent(providerRef)}`, { method: "GET" });
      if (status >= 400) {
        return { processando: false, erro: corpo?.mensagem ?? `O emissor respondeu ${status}.` };
      }
      return lerResposta(corpo);
    },

    async cancelar(providerRef, motivo) {
      const { status, corpo } = await chamar(`/nfse/${encodeURIComponent(providerRef)}`, {
        method: "DELETE",
        body: JSON.stringify({ justificativa: motivo }),
      });
      if (status >= 400) {
        return { ok: false, erro: corpo?.mensagem ?? `O emissor respondeu ${status}.` };
      }
      return { ok: true };
    },
  };
}

function somenteDigitos(v: string): string {
  return v.replace(/\D/g, "");
}
