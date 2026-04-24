import express from 'express';
import { InMemoryOrdemDeServicoRepository } from './infrastructure/repositories/InMemoryOrdemDeServicoRepository';
import { InMemoryProdutoRepository } from './infrastructure/repositories/InMemoryProdutoRepository';
import { AdicionarProdutoNaOS } from './application/ordemDeServico/useCases/AdicionarProdutoNaOS';
import { RemoverProdutoDaOS } from './application/ordemDeServico/useCases/RemoverProdutoDaOS';
import { OrdemDeServicoController } from './infrastructure/http/controllers/OrdemDeServicoController';
import { criarRotasOrdemDeServico } from './infrastructure/http/routes/ordemDeServico.routes';
import { errorHandler } from './infrastructure/http/middlewares/errorHandler';

const osRepository = new InMemoryOrdemDeServicoRepository();
const produtoRepository = new InMemoryProdutoRepository();

const adicionarProdutoNaOS = new AdicionarProdutoNaOS(osRepository, produtoRepository);
const removerProdutoDaOS = new RemoverProdutoDaOS(osRepository, produtoRepository);
const osController = new OrdemDeServicoController(adicionarProdutoNaOS, removerProdutoDaOS);

const app = express();
app.use(express.json());
app.use('/ordens-servico', criarRotasOrdemDeServico(osController));
app.use(errorHandler);

export default app;
