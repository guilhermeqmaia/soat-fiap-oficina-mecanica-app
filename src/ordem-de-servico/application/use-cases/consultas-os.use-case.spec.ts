import { ListarOrdensDeServicoUseCase } from './listar-ordens-de-servico.use-case';
import { ObterTempoMedioExecucaoUseCase } from './obter-tempo-medio-execucao.use-case';
import { BuscarStatusPorNumeroUseCase } from './buscar-status-por-numero.use-case';
import { BuscarDetalhesOrdemDeServicoUseCase } from './buscar-detalhes-ordem-de-servico.use-case';
import { ListarHistoricoPorCpfCnpjUseCase } from './listar-historico-por-cpf-cnpj.use-case';
import { AdicionarServicoUseCase } from './adicionar-servico.use-case';
import { AdicionarProdutoAoServicoUseCase } from './adicionar-produto-ao-servico.use-case';
import { OrdemDeServicoNotFoundError } from '../../domain/errors/ordem-de-servico-not-found.error';
import { ClienteNotFoundError } from '../../domain/errors/cliente-not-found.error';
import { ClienteNotOwnedByUsuarioError } from '../../domain/errors/cliente-not-owned-by-usuario.error';
import { ServicoNotFoundInCatalogError } from '../../domain/errors/servico-not-found-in-catalog.error';
import { ProdutoNotFoundInCatalogError } from '../../domain/errors/produto-not-found-in-catalog.error';

const item = {
  servicoId: 's1',
  quantidade: 1,
  precoUnitario: 50,
  subtotalServico: () => 50,
  produtos: [
    { produtoId: 'p1', quantidade: 2, precoUnitario: 10, subtotal: () => 20 },
  ],
};

function fakeOsComItens(overrides: Record<string, any> = {}) {
  return {
    id: 'os-1',
    numero: 'OS-0001',
    clienteId: 'cli-1',
    veiculoId: 'vei-1',
    usuarioId: 'mec-1',
    descricaoInicial: 'desc',
    diagnostico: 'diag',
    status: 'EM_EXECUCAO',
    createdAt: new Date('2026-01-02T10:30:00Z'),
    updatedAt: new Date('2026-01-03T11:45:00Z'),
    itensServico: [item],
    valorTotalServicos: () => 50,
    valorTotalProdutos: () => 20,
    ...overrides,
  };
}

describe('OS query use cases', () => {
  it('ListarOrdensDeServico delegates to the gateway', async () => {
    const result = { data: [], total: 0, page: 1, limit: 10 };
    const gateway = { findAll: jest.fn().mockResolvedValue(result) };
    const out = await new ListarOrdensDeServicoUseCase(gateway as any).execute({
      page: 1,
      limit: 10,
    });
    expect(out).toBe(result);
    expect(gateway.findAll).toHaveBeenCalled();
  });

  it('ObterTempoMedioExecucao delegates to the gateway', async () => {
    const gateway = { getTempoMedioExecucao: jest.fn().mockResolvedValue({}) };
    await new ObterTempoMedioExecucaoUseCase(gateway as any).execute({});
    expect(gateway.getTempoMedioExecucao).toHaveBeenCalled();
  });

  describe('BuscarStatusPorNumero', () => {
    it('throws NOT_FOUND when numero is unknown', async () => {
      const gateway = { findByNumero: jest.fn().mockResolvedValue(null) };
      await expect(
        new BuscarStatusPorNumeroUseCase(
          gateway as any,
          {} as any,
          {} as any,
        ).execute({ numero: 'X' }),
      ).rejects.toBeInstanceOf(OrdemDeServicoNotFoundError);
    });

    it('assembles the status view with catalog names', async () => {
      const gateway = {
        findByNumero: jest.fn().mockResolvedValue(fakeOsComItens()),
      };
      const servicoGateway = {
        findById: jest.fn().mockResolvedValue({ nome: 'Troca de oleo' }),
      };
      const produtoGateway = {
        findById: jest.fn().mockResolvedValue({ nome: 'Oleo 5W30' }),
      };
      const view = await new BuscarStatusPorNumeroUseCase(
        gateway as any,
        servicoGateway as any,
        produtoGateway as any,
      ).execute({ numero: 'OS-0001' });
      expect(view.numero).toBe('OS-0001');
      expect(view.servicos[0].nome).toBe('Troca de oleo');
      expect(view.servicos[0].produtos[0].nome).toBe('Oleo 5W30');
      expect(view.valorTotal).toBe(70);
    });
  });

  it('BuscarDetalhes assembles header/body/footer', async () => {
    const gateway = {
      findById: jest.fn().mockResolvedValue(fakeOsComItens()),
    };
    const clienteGateway = {
      findById: jest.fn().mockResolvedValue({
        id: 'cli-1',
        nome: 'Joao',
        cpfCnpj: { value: '12345678901' },
        email: 'joao@x.com',
        telefone: '9999',
      }),
    };
    const veiculoGateway = {
      findById: jest.fn().mockResolvedValue({
        id: 'vei-1',
        placa: { value: 'ABC1D23' },
        marca: 'VW',
        modelo: 'Gol',
        ano: 2020,
      }),
    };
    const usuarioGateway = {
      findById: jest.fn().mockResolvedValue({ nome: 'Mecanico' }),
    };
    const servicoGateway = {
      findById: jest.fn().mockResolvedValue({ nome: 'Troca de oleo' }),
    };
    const produtoGateway = {
      findById: jest.fn().mockResolvedValue({ nome: 'Oleo 5W30' }),
    };
    const view = await new BuscarDetalhesOrdemDeServicoUseCase(
      gateway as any,
      clienteGateway as any,
      veiculoGateway as any,
      usuarioGateway as any,
      servicoGateway as any,
      produtoGateway as any,
    ).execute({ id: 'os-1' });
    expect(view.cabecalho.dadosCliente.nome).toBe('Joao');
    expect(view.cabecalho.dadosVeiculo.placa).toBe('ABC1D23');
    expect(view.cabecalho.mecanicoAtribuido).toBe('Mecanico');
    expect(view.rodape.valorTotalOrdemServico).toBe(70);
  });

  describe('ListarHistoricoPorCpfCnpj', () => {
    const base = {
      cpfCnpj: '12345678901',
      emailClienteAutenticado: 'dono@x.com',
    };

    it('throws NOT_FOUND when cliente is unknown', async () => {
      const clienteGateway = {
        findByCpfCnpj: jest.fn().mockResolvedValue(null),
      };
      await expect(
        new ListarHistoricoPorCpfCnpjUseCase(
          {} as any,
          clienteGateway as any,
        ).execute(base),
      ).rejects.toBeInstanceOf(ClienteNotFoundError);
    });

    it('throws FORBIDDEN when email does not match', async () => {
      const clienteGateway = {
        findByCpfCnpj: jest.fn().mockResolvedValue({ email: 'outro@x.com' }),
      };
      await expect(
        new ListarHistoricoPorCpfCnpjUseCase(
          {} as any,
          clienteGateway as any,
        ).execute(base),
      ).rejects.toBeInstanceOf(ClienteNotOwnedByUsuarioError);
    });

    it('returns mapped history when owned', async () => {
      const clienteGateway = {
        findByCpfCnpj: jest
          .fn()
          .mockResolvedValue({ id: 'cli-1', email: 'dono@x.com' }),
      };
      const gateway = {
        findAll: jest.fn().mockResolvedValue({
          data: [
            {
              numero: 'OS-1',
              status: 'ENTREGUE',
              descricaoInicial: 'd',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          total: 1,
          page: 1,
          limit: 10,
        }),
      };
      const out = await new ListarHistoricoPorCpfCnpjUseCase(
        gateway as any,
        clienteGateway as any,
      ).execute(base);
      expect(out.data).toHaveLength(1);
      expect(out.data[0].numero).toBe('OS-1');
    });
  });

  describe('Adicionar servico/produto catalog validation', () => {
    function gatewayWith(os: any) {
      return {
        findById: jest.fn().mockResolvedValue(os),
        update: jest.fn((o) => Promise.resolve(o)),
      };
    }

    it('AdicionarServico throws when servico not in catalog', async () => {
      const os = { adicionarServico: jest.fn() };
      const servicoGateway = { findById: jest.fn().mockResolvedValue(null) };
      await expect(
        new AdicionarServicoUseCase(
          gatewayWith(os) as any,
          servicoGateway as any,
        ).execute({ id: 'os-1', servicoId: 's1', quantidade: 1 }),
      ).rejects.toBeInstanceOf(ServicoNotFoundInCatalogError);
    });

    it('AdicionarServico adds the item with catalog price', async () => {
      const os = { adicionarServico: jest.fn() };
      const g = gatewayWith(os);
      const servicoGateway = {
        findById: jest.fn().mockResolvedValue({ precoBase: { value: 99 } }),
      };
      await new AdicionarServicoUseCase(g as any, servicoGateway as any).execute(
        { id: 'os-1', servicoId: 's1', quantidade: 2 },
      );
      expect(os.adicionarServico).toHaveBeenCalledTimes(1);
      expect(g.update).toHaveBeenCalled();
    });

    function estoqueMock() {
      return {
        reservar: jest.fn().mockResolvedValue(undefined),
        baixar: jest.fn().mockResolvedValue(undefined),
        liberar: jest.fn().mockResolvedValue(undefined),
      };
    }

    it('AdicionarProduto throws when produto not in catalog', async () => {
      const os = { adicionarProdutoAoServico: jest.fn() };
      const produtoGateway = { findById: jest.fn().mockResolvedValue(null) };
      const estoque = estoqueMock();
      await expect(
        new AdicionarProdutoAoServicoUseCase(
          gatewayWith(os) as any,
          produtoGateway as any,
          estoque as any,
        ).execute({
          id: 'os-1',
          servicoId: 's1',
          produtoId: 'p1',
          quantidade: 1,
        }),
      ).rejects.toBeInstanceOf(ProdutoNotFoundInCatalogError);
      expect(estoque.reservar).not.toHaveBeenCalled();
    });

    it('AdicionarProduto adds the item, reserves stock and persists', async () => {
      const os = { adicionarProdutoAoServico: jest.fn() };
      const g = gatewayWith(os);
      const produtoGateway = {
        findById: jest.fn().mockResolvedValue({ precoUnitario: { value: 15 } }),
      };
      const estoque = estoqueMock();
      await new AdicionarProdutoAoServicoUseCase(
        g as any,
        produtoGateway as any,
        estoque as any,
      ).execute({ id: 'os-1', servicoId: 's1', produtoId: 'p1', quantidade: 3 });
      expect(os.adicionarProdutoAoServico).toHaveBeenCalledWith(
        's1',
        expect.anything(),
      );
      expect(estoque.reservar).toHaveBeenCalledWith(
        'p1',
        3,
        expect.objectContaining({ motivo: expect.any(String) }),
      );
      expect(g.update).toHaveBeenCalled();
    });

    it('AdicionarProduto compensates the reservation when persisting the OS fails', async () => {
      const os = { adicionarProdutoAoServico: jest.fn() };
      const g = {
        findById: jest.fn().mockResolvedValue(os),
        update: jest.fn().mockRejectedValue(new Error('db down')),
      };
      const produtoGateway = {
        findById: jest.fn().mockResolvedValue({ precoUnitario: { value: 15 } }),
      };
      const estoque = estoqueMock();

      await expect(
        new AdicionarProdutoAoServicoUseCase(
          g as any,
          produtoGateway as any,
          estoque as any,
        ).execute({ id: 'os-1', servicoId: 's1', produtoId: 'p1', quantidade: 3 }),
      ).rejects.toThrow('db down');

      expect(estoque.reservar).toHaveBeenCalledWith('p1', 3, expect.any(Object));
      expect(estoque.liberar).toHaveBeenCalledWith('p1', 3, expect.any(Object));
    });
  });
});
