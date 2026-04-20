import { Router } from 'express';
import { OrdemDeServicoController } from '../controllers/OrdemDeServicoController';

/**
 * @param controller instância já configurada com os use cases injetados
 */
export function criarRotasOrdemDeServico(controller: OrdemDeServicoController): Router {
  const router = Router();

  /** POST /ordens-servico/:id/produtos */
  router.post('/:id/produtos', controller.adicionarProduto);

  /** DELETE /ordens-servico/:id/produtos/:produtoId */
  router.delete('/:id/produtos/:produtoId', controller.removerProduto);

  return router;
}
