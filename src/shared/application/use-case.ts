/**
 * Contrato marcador de um caso de uso da aplicacao.
 *
 * Cada use case tem UMA responsabilidade e expoe um unico metodo `execute`,
 * recebendo um objeto de Input proprio (desacoplado de DTOs HTTP) e devolvendo
 * um objeto de Output. Casos sem entrada usam `void` em `Input`.
 */
export interface UseCase<Input, Output> {
  execute(input: Input): Promise<Output> | Output;
}
