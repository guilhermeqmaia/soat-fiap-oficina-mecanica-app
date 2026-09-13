import { Inject, Injectable } from "@nestjs/common";
import { UseCase } from "../../../shared/application/use-case";
import {
  DOMAIN_EVENT_PUBLISHER,
  DomainEventPublisher,
} from "../../../shared/application/domain-event-publisher";
import { OrdemDeServico } from "../../domain/ordem-de-servico.entity";
import {
  ORDEM_DE_SERVICO_GATEWAY,
  OrdemDeServicoGateway,
} from "../gateways/ordem-de-servico.gateway";
import { carregarOrdemOuFalhar } from "./carregar-ordem";
import { publicarMudancaDeStatus } from "./publicar-mudanca-de-status";

export interface EntregarOrdemDeServicoInput {
  id: string;
}

@Injectable()
export class EntregarOrdemDeServicoUseCase implements UseCase<
  EntregarOrdemDeServicoInput,
  OrdemDeServico
> {
  constructor(
    @Inject(ORDEM_DE_SERVICO_GATEWAY)
    private readonly gateway: OrdemDeServicoGateway,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly events: DomainEventPublisher,
  ) {}

  async execute(input: EntregarOrdemDeServicoInput): Promise<OrdemDeServico> {
    const ordem = await carregarOrdemOuFalhar(this.gateway, input.id);
    const statusAnterior = ordem.status;
    // updatedAt antes da mutacao ~ momento em que a OS entrou no status atual
    const entradaNoStatusAnterior = ordem.updatedAt ?? ordem.createdAt;
    ordem.entregar();
    const updated = await this.gateway.update(ordem);
    publicarMudancaDeStatus(
      this.events,
      updated,
      statusAnterior,
      entradaNoStatusAnterior,
    );
    return updated;
  }
}
