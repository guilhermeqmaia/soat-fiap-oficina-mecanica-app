import { ListarNotificacoesPorCpfCnpjUseCase } from './listar-notificacoes-por-cpf-cnpj.use-case';
import { ClienteNotFoundError } from '../../../ordem-de-servico/domain/errors/cliente-not-found.error';
import { ClienteNotOwnedByUsuarioError } from '../../../ordem-de-servico/domain/errors/cliente-not-owned-by-usuario.error';

const baseInput = {
  cpfCnpj: '52998224725',
  emailCliente: 'dono@email.com',
};

describe('ListarNotificacoesPorCpfCnpjUseCase', () => {
  let gateway: any;
  let clienteGateway: any;
  let useCase: ListarNotificacoesPorCpfCnpjUseCase;

  beforeEach(() => {
    gateway = {
      findAll: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 }),
    };
    clienteGateway = { findByCpfCnpj: jest.fn() };
    useCase = new ListarNotificacoesPorCpfCnpjUseCase(gateway, clienteGateway);
  });

  it('lanca ClienteNotFoundError quando o cliente nao existe', async () => {
    clienteGateway.findByCpfCnpj.mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      ClienteNotFoundError,
    );
    expect(gateway.findAll).not.toHaveBeenCalled();
  });

  it('lanca ClienteNotOwnedByUsuarioError quando o email nao confere', async () => {
    clienteGateway.findByCpfCnpj.mockResolvedValue({
      id: 'cli-1',
      email: 'outro@email.com',
    });

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      ClienteNotOwnedByUsuarioError,
    );
    expect(gateway.findAll).not.toHaveBeenCalled();
  });

  it('lanca ClienteNotOwnedByUsuarioError quando o cliente nao tem email', async () => {
    clienteGateway.findByCpfCnpj.mockResolvedValue({ id: 'cli-1', email: null });

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      ClienteNotOwnedByUsuarioError,
    );
  });

  it('retorna notificacoes paginadas quando cliente e dono', async () => {
    clienteGateway.findByCpfCnpj.mockResolvedValue({
      id: 'cli-1',
      email: 'dono@email.com',
    });
    const paginatedResult = {
      data: [{ id: 'n-1' }],
      total: 1,
      page: 1,
      limit: 20,
    };
    gateway.findAll.mockResolvedValue(paginatedResult);

    const result = await useCase.execute(baseInput);

    expect(gateway.findAll).toHaveBeenCalledWith({
      clienteId: 'cli-1',
      page: 1,
      limit: 20,
    });
    expect(result).toBe(paginatedResult);
  });

  it('usa limit padrao de 20 quando nao fornecido', async () => {
    clienteGateway.findByCpfCnpj.mockResolvedValue({
      id: 'cli-1',
      email: 'dono@email.com',
    });

    await useCase.execute(baseInput);

    expect(gateway.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20 }),
    );
  });

  it('usa page e limit fornecidos quando presentes', async () => {
    clienteGateway.findByCpfCnpj.mockResolvedValue({
      id: 'cli-1',
      email: 'dono@email.com',
    });

    await useCase.execute({ ...baseInput, page: 2, limit: 5 });

    expect(gateway.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 5 }),
    );
  });

  it('comparacao de email e case-insensitive', async () => {
    clienteGateway.findByCpfCnpj.mockResolvedValue({
      id: 'cli-1',
      email: 'DONO@EMAIL.COM',
    });

    await expect(useCase.execute(baseInput)).resolves.toBeDefined();
    expect(gateway.findAll).toHaveBeenCalled();
  });
});
