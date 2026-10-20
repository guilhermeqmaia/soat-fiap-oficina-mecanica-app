import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '@guilhermeqmaia/oficina-kit/core';
import { OrdemDeServico } from '../../../domain/ordem-de-servico.entity';
import { ItemServicoOS } from '../../../domain/value-objects/item-servico-os.vo';
import { ItemProdutoOS } from '../../../domain/value-objects/item-produto-os.vo';
import { OrdemDeServicoNotFoundError } from '../../../domain/errors/ordem-de-servico-not-found.error';
import { ORDEM_DE_SERVICO_GATEWAY, OrdemDeServicoGateway } from '../../gateways/ordem-de-servico.gateway';

export interface ItemDiagnosticoInput {
  tipo: 'SERVICO' | 'PRODUTO';
  referenciaId: string;
  nome: string;
  quantidade: number;
  /** Decimal como string ("150.00") ou numero — formato do AsyncAPI. */
  precoUnitario: string | number;
  /** Produtos pertencem a um servico (referenciaId do servico pai). */
  servicoId?: string;
}

export interface RegistrarDiagnosticoInput {
  numero: string;
  mecanicoId: string;
  diagnostico: string;
  itens: ItemDiagnosticoInput[];
}

/**
 * `execucao.diagnostico-concluido`: grava o snapshot dos itens com precos
 * congelados. Idempotente por construcao: reaplicar o mesmo evento produz o
 * mesmo snapshot (substitui, nao acumula).
 */
@Injectable()
export class RegistrarDiagnosticoUseCase implements UseCase<RegistrarDiagnosticoInput, OrdemDeServico> {
  constructor(@Inject(ORDEM_DE_SERVICO_GATEWAY) private readonly gateway: OrdemDeServicoGateway) {}

  async execute(input: RegistrarDiagnosticoInput): Promise<OrdemDeServico> {
    const ordem = await this.gateway.findByNumero(input.numero);
    if (!ordem) throw new OrdemDeServicoNotFoundError(input.numero);

    ordem.registrarDiagnostico({
      diagnostico: input.diagnostico,
      mecanicoId: input.mecanicoId,
      itens: RegistrarDiagnosticoUseCase.montarItens(input.itens),
    });
    return this.gateway.update(ordem);
  }

  /** Agrupa os produtos sob o servico pai; produtos sem pai entram num servico "Pecas avulsas". */
  static montarItens(itens: ItemDiagnosticoInput[]): ItemServicoOS[] {
    const preco = (v: string | number) => Number(v);
    const servicos = itens.filter((i) => i.tipo === 'SERVICO');
    const produtos = itens.filter((i) => i.tipo === 'PRODUTO');
    const porServico = new Map<string, ItemProdutoOS[]>();
    const avulsos: ItemProdutoOS[] = [];
    for (const p of produtos) {
      const item = new ItemProdutoOS(p.referenciaId, p.nome, p.quantidade, preco(p.precoUnitario));
      if (p.servicoId && servicos.some((s) => s.referenciaId === p.servicoId)) {
        porServico.set(p.servicoId, [...(porServico.get(p.servicoId) ?? []), item]);
      } else {
        avulsos.push(item);
      }
    }
    const resultado = servicos.map(
      (s) => new ItemServicoOS(s.referenciaId, s.nome, s.quantidade, preco(s.precoUnitario), porServico.get(s.referenciaId) ?? []),
    );
    if (avulsos.length > 0) resultado.push(new ItemServicoOS('pecas-avulsas', 'Pecas avulsas', 1, 0, avulsos));
    return resultado;
  }
}
