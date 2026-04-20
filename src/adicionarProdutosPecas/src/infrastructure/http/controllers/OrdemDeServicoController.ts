import { Request, Response, NextFunction } from 'express';
import { AdicionarProdutoNaOS } from '../../../application/ordemDeServico/useCases/AdicionarProdutoNaOS';
import { RemoverProdutoDaOS } from '../../../application/ordemDeServico/useCases/RemoverProdutoDaOS';

/**
 * Controller: OrdemDeServicoController
 * Responsabilidade: traduzir HTTP ↔ Application (Use Cases).
 * Não contém lógica de negócio.
 */
export class OrdemDeServicoController {
  constructor(
    private readonly adicionarProdutoNaOSUC: AdicionarProdutoNaOS,
    private readonly removerProdutoDaOSUC: RemoverProdutoDaOS
  ) {}

  /**
   * POST /ordens-servico/:id/produtos
   * Body: { produtoId: string, quantidade: number }
   */
  adicionarProduto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ordemDeServicoId = req.params['id'] as string;
      const { produtoId, quantidade } = req.body as { produtoId?: string; quantidade?: number };

      if (!produtoId || quantidade == null) {
        res.status(400).json({ erro: 'Campos obrigatórios: produtoId, quantidade.' });
        return;
      }

      const resultado = await this.adicionarProdutoNaOSUC.executar({
        ordemDeServicoId,
        produtoId,
        quantidade: Number(quantidade),
      });

      res.status(201).json({ mensagem: 'Produto adicionado à OS com sucesso.', ...resultado });
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /ordens-servico/:id/produtos/:produtoId
   */
  removerProduto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ordemDeServicoId = req.params['id'] as string;
      const produtoId = req.params['produtoId'] as string;

      const resultado = await this.removerProdutoDaOSUC.executar({ ordemDeServicoId, produtoId });

      res.status(200).json({
        mensagem: 'Produto removido da OS. Reserva no estoque estornada.',
        ...resultado,
      });
    } catch (err) {
      next(err);
    }
  };
}
