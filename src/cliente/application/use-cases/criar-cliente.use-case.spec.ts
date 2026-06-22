import { CriarClienteUseCase } from './criar-cliente.use-case';
import { DuplicateCpfCnpjError } from '../../domain/errors/duplicate-cpf-cnpj.error';

describe('CriarClienteUseCase', () => {
  let gateway: any;
  let useCase: CriarClienteUseCase;

  const input = {
    nome: 'Joao da Silva',
    cpfCnpj: '52998224725',
    telefone: '11999998888',
    email: 'joao@email.com',
  };

  beforeEach(() => {
    gateway = {
      existsByCpfCnpj: jest.fn(),
      create: jest.fn((c) => Promise.resolve(c)),
    };
    useCase = new CriarClienteUseCase(gateway);
  });

  it('creates a cliente when cpfCnpj is unique', async () => {
    gateway.existsByCpfCnpj.mockResolvedValue(false);

    const result = await useCase.execute(input);

    expect(gateway.existsByCpfCnpj).toHaveBeenCalledWith('52998224725');
    expect(gateway.create).toHaveBeenCalledTimes(1);
    expect(result.nome).toBe('Joao da Silva');
  });

  it('strips mask from cpfCnpj before checking uniqueness', async () => {
    gateway.existsByCpfCnpj.mockResolvedValue(false);

    await useCase.execute({ ...input, cpfCnpj: '529.982.247-25' });

    expect(gateway.existsByCpfCnpj).toHaveBeenCalledWith('52998224725');
  });

  it('throws DuplicateCpfCnpjError when cpfCnpj already exists', async () => {
    gateway.existsByCpfCnpj.mockResolvedValue(true);

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      DuplicateCpfCnpjError,
    );
    expect(gateway.create).not.toHaveBeenCalled();
  });
});
