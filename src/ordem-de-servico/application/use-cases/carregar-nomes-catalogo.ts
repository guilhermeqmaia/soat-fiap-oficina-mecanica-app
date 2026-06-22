import {
  ProdutoConsultaGateway,
  ServicoConsultaGateway,
} from '../gateways/consulta.gateways';

/** Carrega o nome de cada servico (catalogo) num Map id->nome, sem duplicar reads. */
export async function carregarNomesServicos(
  gateway: ServicoConsultaGateway,
  servicoIds: string[],
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(servicoIds));
  const map = new Map<string, string>();
  await Promise.all(
    unique.map(async (id) => {
      const servico = await gateway.findById(id);
      if (servico) map.set(id, servico.nome);
    }),
  );
  return map;
}

/** Carrega o nome de cada produto (catalogo) num Map id->nome, sem duplicar reads. */
export async function carregarNomesProdutos(
  gateway: ProdutoConsultaGateway,
  produtoIds: string[],
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(produtoIds));
  const map = new Map<string, string>();
  await Promise.all(
    unique.map(async (id) => {
      const produto = await gateway.findById(id);
      if (produto) map.set(id, produto.nome);
    }),
  );
  return map;
}
