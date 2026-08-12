/**
 * A ponte com o emissor de NFS-e.
 *
 * Fica atrás de uma interface porque a escolha do emissor é comercial, não
 * técnica: preço e cobertura mudam, e trocar de fornecedor não pode significar
 * reescrever a emissão. Quem chama daqui de fora não sabe qual está em uso.
 *
 * O que nunca muda de lugar: o certificado digital e a chave da API ficam no
 * Secret Manager e são lidos só aqui dentro. Nada disso chega ao aplicativo.
 */

export interface EmitirEntrada {
  /** Identificador nosso, mandado ao emissor para ele não duplicar em caso de retentativa. */
  referencia: string;
  prestador: {
    cnpj: string;
    inscricaoMunicipal: string;
    codigoMunicipio?: string;
    regimeSimples: boolean;
  };
  tomador: {
    nome: string;
    cpf?: string;
    email?: string;
  };
  servico: {
    descricao: string;
    valor: number;
    codigoServico: string;
    issAliquota?: number;
    competencia: string;
  };
}

export interface EmitirSaida {
  /** Pedido aceito, ainda em processamento na prefeitura. */
  processando: boolean;
  numero?: string;
  chaveAcesso?: string;
  linkPdf?: string;
  linkXml?: string;
  providerRef?: string;
  erro?: string;
}

export interface NfseProvider {
  nome: string;
  emitir(entrada: EmitirEntrada): Promise<EmitirSaida>;
  consultar(providerRef: string): Promise<EmitirSaida>;
  cancelar(providerRef: string, motivo: string): Promise<{ ok: boolean; erro?: string }>;
}
