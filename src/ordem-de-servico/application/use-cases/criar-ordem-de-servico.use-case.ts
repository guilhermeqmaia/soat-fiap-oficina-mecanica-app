import { Inject, Injectable, Logger } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { OrdemDeServico } from '../../domain/ordem-de-servico.entity';
import { ItemServicoOS } from '../../domain/value-objects/item-servico-os.vo';
import { ItemProdutoOS } from '../../domain/value-objects/item-produto-os.vo';
import { ClienteNotFoundError } from '../../domain/errors/cliente-not-found.error';
import { VeiculoNotFoundError } from '../../domain/errors/veiculo-not-found.error';
import { VeiculoClienteMismatchError } from '../../domain/errors/veiculo-cliente-mismatch.error';
import { ServicoNotFoundInCatalogError } from '../../domain/errors/servico-not-found-in-catalog.error';
import { ProdutoNotFoundInCatalogError } from '../../domain/errors/produto-not-found-in-catalog.error';
import {
  ORDEM_DE_SERVICO_GATEWAY,
  OrdemDeServicoGateway,
} from '../gateways/ordem-de-servico.gateway';
import {
  CLIENTE_CONSULTA_GATEWAY,
  ClienteConsultaGateway,
  PRODUTO_CONSULTA_GATEWAY,
  ProdutoConsultaGateway,
  SERVICO_CONSULTA_GATEWAY,
  ServicoConsultaGateway,
  VEICULO_CONSULTA_GATEWAY,
  VeiculoConsultaGateway,
} from '../gateways/consulta.gateways';
import {
  ESTOQUE_MOVIMENTO_GATEWAY,
  EstoqueMovimentoGateway,
} from '../gateways/estoque-movimento.gateway';

export interface CriarOrdemDeServicoItemProdutoInput {
  produtoId: string;
  quantidade: number;
}

export interface CriarOrdemDeServicoItemServicoInput {
  servicoId: string;
  quantidade: number;
  produtos?: CriarOrdemDeServicoItemProdutoInput[];
}

export interface CriarOrdemDeServicoInput {
  clienteId: string;
  veiculoId: string;
  descricaoInicial: string;
  servicos?: CriarOrdemDeServicoItemServicoInput[];
}

@Injectable()
export class CriarOrdemDeServicoUseCase
  implements UseCase<CriarOrdemDeServicoInput, OrdemDeServico>
{
  private readonly logger = new Logger(CriarOrdemDeServicoUseCase.name);

  constructor(
    @Inject(ORDEM_DE_SERVICO_GATEWAY)
    private readonly gateway: OrdemDeServicoGateway,
    @Inject(CLIENTE_CONSULTA_GATEWAY)
    private readonly clienteGateway: ClienteConsultaGateway,
    @Inject(VEICULO_CONSULTA_GATEWAY)
    private readonly veiculoGateway: VeiculoConsultaGateway,
    @Inject(SERVICO_CONSULTA_GATEWAY)
    private readonly servicoGateway: ServicoConsultaGateway,
    @Inject(PRODUTO_CONSULTA_GATEWAY)
    private readonly produtoGateway: ProdutoConsultaGateway,
    @Inject(ESTOQUE_MOVIMENTO_GATEWAY)
    private readonly estoque: EstoqueMovimentoGateway,
  ) {}

  async execute(input: CriarOrdemDeServicoInput): Promise<OrdemDeServico> {
    const cliente = await this.clienteGateway.findById(input.clienteId);
    if (!cliente) {
      throw new ClienteNotFoundError(input.clienteId);
    }

    const veiculo = await this.veiculoGateway.findById(input.veiculoId);
    if (!veiculo) {
      throw new VeiculoNotFoundError(input.veiculoId);
    }

    if (veiculo.clienteId !== input.clienteId) {
      throw new VeiculoClienteMismatchError(input.veiculoId, input.clienteId);
    }

    const servicosIniciais = input.servicos ?? [];
    const itensServico = await this.montarItensIniciais(servicosIniciais);

    // Constroi a OS em memoria (valida descricao e servicos duplicados) antes de
    // reservar estoque, para nao reservar sem conseguir criar a OS.
    const ordem = OrdemDeServico.create({
      clienteId: input.clienteId,
      veiculoId: input.veiculoId,
      descricaoInicial: input.descricaoInicial,
      itensServico,
    });

    // Reserva o estoque das pecas declaradas na abertura (mesma politica do
    // AdicionarProdutoAoServicoUseCase). Falta de estoque impede a criacao.
    const reservados = await this.reservarProdutosIniciais(
      ordem,
      servicosIniciais,
    );

    try {
      return await this.gateway.create(ordem);
    } catch (err) {
      // Compensa as reservas ja feitas se a persistencia da OS falhar.
      await this.liberarReservas(ordem, reservados);
      throw err;
    }
  }

  private async montarItensIniciais(
    servicos: CriarOrdemDeServicoItemServicoInput[],
  ): Promise<ItemServicoOS[]> {
    const itens: ItemServicoOS[] = [];

    for (const s of servicos) {
      const servico = await this.servicoGateway.findById(s.servicoId);
      if (!servico) {
        throw new ServicoNotFoundInCatalogError(s.servicoId);
      }

      const produtos: ItemProdutoOS[] = [];
      for (const p of s.produtos ?? []) {
        const produto = await this.produtoGateway.findById(p.produtoId);
        if (!produto) {
          throw new ProdutoNotFoundInCatalogError(p.produtoId);
        }
        produtos.push(
          new ItemProdutoOS(
            p.produtoId,
            p.quantidade,
            produto.precoUnitario.value,
          ),
        );
      }

      itens.push(
        new ItemServicoOS(
          s.servicoId,
          s.quantidade,
          servico.precoBase.value,
          'PENDENTE',
          null,
          null,
          null,
          produtos,
        ),
      );
    }

    return itens;
  }

  private ctxAbertura(ordem: OrdemDeServico) {
    return {
      ordemDeServicoId: ordem.id,
      motivo: `Reserva inicial na abertura da OS ${ordem.numero}`,
    };
  }

  private async reservarProdutosIniciais(
    ordem: OrdemDeServico,
    servicos: CriarOrdemDeServicoItemServicoInput[],
  ): Promise<Array<{ produtoId: string; quantidade: number }>> {
    const reservados: Array<{ produtoId: string; quantidade: number }> = [];
    try {
      for (const s of servicos) {
        for (const p of s.produtos ?? []) {
          await this.estoque.reservar(
            p.produtoId,
            p.quantidade,
            this.ctxAbertura(ordem),
          );
          reservados.push({ produtoId: p.produtoId, quantidade: p.quantidade });
        }
      }
      return reservados;
    } catch (err) {
      // Falha (ex.: estoque insuficiente) no meio do loop: estorna o que ja
      // foi reservado antes de propagar o erro.
      await this.liberarReservas(ordem, reservados);
      throw err;
    }
  }

  private async liberarReservas(
    ordem: OrdemDeServico,
    reservados: Array<{ produtoId: string; quantidade: number }>,
  ): Promise<void> {
    for (const r of reservados) {
      try {
        await this.estoque.liberar(
          r.produtoId,
          r.quantidade,
          this.ctxAbertura(ordem),
        );
      } catch (err) {
        this.logger.error(
          `Falha ao compensar reserva do produto ${r.produtoId} na abertura da OS: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }
  }
}
