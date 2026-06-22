/**
 * Contrato minimo de um evento de dominio. Cada evento expoe seu nome estavel
 * (`eventName`), usado pelo publisher para roteamento, sem acoplar a aplicacao
 * a nenhum framework de eventos.
 */
export interface DomainEvent {
  readonly eventName: string;
}
