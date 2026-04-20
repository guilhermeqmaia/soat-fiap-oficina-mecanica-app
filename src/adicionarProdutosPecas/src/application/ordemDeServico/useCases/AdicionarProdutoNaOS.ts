import { IOrdemDeServicoRepository } from '../../../domain/ordemDeServico/repositories/IOrdemDeServicoRepository';
import { IProdutoRepository } from '../../../domain/produto/repositories/IProdutoRepository';
import {
  ErroOSNaoEncontrada,
  ErroProdutoNaoEncontrado,
  ErroEstoqueInsuficiente,
} from '../../../shared/errors/DomainErrors';
import { ItemOrdemDeServicoJSON } from '../../../domain/ordemDeServico/valueObjects/ItemOrdemDeServico';

export interface AdicionarProdutoNaOSCommand {
  ordemDeServicoId: string;
  produtoId: string;
  quantidade: number;
}

export interface AdicionarProdutoNaOSResult {
  item: ItemOrdemDeServicoJSON;
  valorTotalProdutos: number;
}

/**
 * Use Case: AdicionarProdutoNaOS
 * Camada: Application — BC Atendimento
 *
 * Fluxo:
 *  1. Valida existência da OS
 *  2. Valida existência e disponibilidade do produto (BC Estoque)
 *  3. Adiciona item à OS (domínio valida status e emite ProdutoAdicionadoNaOS)
 *  4. Reserva estoque
 *  5. Persiste OS
 *
 * ⚠️  Os repositórios são injetados via construtor — configure no server.ts.
 */
export class AdicionarProdutoNaOS {
  constructor(
    private readonly osRepository: IOrdemDeServicoRepository,
    private readonly produtoRepository: IProdutoRepository
  ) {}

  async executar({ ordemDeServicoId, produtoId, quantidade }: AdicionarProdutoNaOSCommand): Promise<AdicionarProdutoNaOSResult> {
    // 1. Buscar OS
    const os = await this.osRepository.buscarPorId(ordemDeServicoId);
    if (!os) throw new ErroOSNaoEncontrada(ordemDeServicoId);

    // 2. Buscar Produto no BC de Estoque
    const produto = await this.produtoRepository.buscarPorId(produtoId);
    if (!produto) throw new ErroProdutoNaoEncontrado(produtoId);

    // 3. Verificar disponibilidade — Policy v3 (sem estoque → informar mecânico)
    const temEstoque = await this.produtoRepository.verificarDisponibilidade(produtoId, quantidade);
    if (!temEstoque) {
      throw new ErroEstoqueInsuficiente({
        produtoId,
        nomeProduto: produto.nome,
        quantidadeSolicitada: quantidade,
        quantidadeDisponivel: produto.quantidadeDisponivel,
      });
    }

    // 4. Adicionar item à OS (regra de domínio valida status EM_DIAGNOSTICO)
    const itemAdicionado = os.adicionarProduto({
      produtoId: produto.id,
      nomeProduto: produto.nome,
      quantidade,
      valorUnitario: produto.valorUnitario,
    });

    // 5. Reservar estoque
    await this.produtoRepository.reservarEstoque(produtoId, quantidade);

    // 6. Persistir OS atualizada
    await this.osRepository.salvar(os);

    // (Opcional) publicar domain events para outros BCs
    const events = os.pullEvents();
    // ⚠️  Se o grupo usar um event bus, publique os events aqui:
    // events.forEach(event => eventBus.publish(event));
    void events;

    return {
      item: itemAdicionado.toJSON(),
      valorTotalProdutos: os.valorTotalProdutos,
    };
  }
}
