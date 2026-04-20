import express from 'express';

// ─── Repositórios (troque pelas implementações reais quando o BD for definido) ──
import { InMemoryOrdemDeServicoRepository } from './infrastructure/repositories/InMemoryOrdemDeServicoRepository';
import { InMemoryProdutoRepository } from './infrastructure/repositories/InMemoryProdutoRepository';

// ─── Use Cases ────────────────────────────────────────────────────────────────
import { AdicionarProdutoNaOS } from './application/ordemDeServico/useCases/AdicionarProdutoNaOS';
import { RemoverProdutoDaOS } from './application/ordemDeServico/useCases/RemoverProdutoDaOS';

// ─── Controller & Rotas ───────────────────────────────────────────────────────
import { OrdemDeServicoController } from './infrastructure/http/controllers/OrdemDeServicoController';
import { criarRotasOrdemDeServico } from './infrastructure/http/routes/ordemDeServico.routes';
import { errorHandler } from './infrastructure/http/middlewares/errorHandler';

// ─── Composição (Dependency Injection manual) ─────────────────────────────────
// ⚠️  Quando o banco for definido, substitua apenas as duas linhas abaixo:
const osRepository = new InMemoryOrdemDeServicoRepository();
const produtoRepository = new InMemoryProdutoRepository();

const adicionarProdutoNaOS = new AdicionarProdutoNaOS(osRepository, produtoRepository);
const removerProdutoDaOS = new RemoverProdutoDaOS(osRepository, produtoRepository);
const osController = new OrdemDeServicoController(adicionarProdutoNaOS, removerProdutoDaOS);

// ─── App ──────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

app.use('/ordens-servico', criarRotasOrdemDeServico(osController));
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Oficina API rodando em http://localhost:${PORT}`);
  console.log('\nRotas disponíveis:');
  console.log('  POST   /ordens-servico/:id/produtos');
  console.log('  DELETE /ordens-servico/:id/produtos/:produtoId');
});

export default app;
