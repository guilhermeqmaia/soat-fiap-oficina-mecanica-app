import { MotivoCancelamento } from '../value-objects/motivo-cancelamento';

/**
 * Fato do ciclo de vida que outros servicos precisam saber (AsyncAPI, canal
 * `oficina-os`). O dominio so descreve `type` + `data`; a infraestrutura
 * embrulha no envelope (ADR-0009) e grava no outbox na mesma transacao.
 */
export type EventoIntegracao =
  | { type: 'os.aberta'; data: OsAbertaData }
  | { type: 'os.cancelada'; data: { numeroOS: string; motivo: MotivoCancelamento } }
  | { type: 'os.finalizada'; data: { numeroOS: string } }
  | { type: 'os.entregue'; data: { numeroOS: string } };

export interface OsAbertaData {
  numeroOS: string;
  cliente: { id: string; nome: string; cpfMascarado: string };
  veiculo: { id: string; placa: string; modelo: string };
  descricaoProblema: string;
}

/** Resumo de cliente/veiculo que viaja em `os.aberta` (nunca o documento completo). */
export interface ResumoAberturaOS {
  cliente: { nome: string; cpfCnpj: string };
  veiculo: { placa: string; modelo: string };
}

/** CPF `52998224725` vira `***.***.***-25`; CNPJ mantem so os 2 digitos verificadores. */
export function mascararDocumento(documento: string): string {
  const digitos = documento.replace(/\D/g, '');
  const fim = digitos.slice(-2);
  return digitos.length > 11 ? `**.***.***/****-${fim}` : `***.***.***-${fim}`;
}
