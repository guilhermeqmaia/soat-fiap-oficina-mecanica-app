import { IOrdemDeServicoRepository } from '../../../domain/ordemDeServico/repositories/IOrdemDeServicoRepository';
import { IProdutoRepository } from '../../../domain/produto/repositories/IProdutoRepository';
import { ErroOSNaoEncontrada } from '../../../shared/errors/DomainErrors';
import { ItemOrdemDeServicoJSON } from '../../../domain/ordemDeServico/valueObjects/ItemOrdemDeServico';

export interface RemoverProdutoDaOSCommand {
  ordemDeServicoId: string;
  produtoId: string;
}

export interface RemoverProdutoDaOSResult {
  itemRemovido: ItemOrdemDeServicoJSON;
  valorTotalProdutos: number;
}

export class RemoverProdutoDaOS {
  constructor(
    private readonly osRepository: IOrdemDeServicoRepository,
    private readonly produtoRepository: IProdutoRepository
  ) {}

  async executar({ ordemDeServicoId, produtoId }: RemoverProdutoDaOSCommand): Promise<RemoverProdutoDaOSResult> {
    // 1. Buscar OS
    const os = await this.osRepository.buscarPorId(ordemDeServicoId);
    if (!os) throw new ErroOSNaoEncontrada(ordemDeServicoId);

    // 2. Remover item (domínio valida status EM_DIAGNOSTICO e existência do item)
    const itemRemovido = os.removerProduto(produtoId);

    // 3. Estornar reserva no estoque
    await this.produtoRepository.estornarReserva(produtoId, itemRemovido.quantidade);

    // 4. Persistir OS atualizada
    await this.osRepository.salvar(os);

    os.pullEvents();

    return {
      itemRemovido: itemRemovido.toJSON(),
      valorTotalProdutos: os.valorTotalProdutos,
    };
  }
}
