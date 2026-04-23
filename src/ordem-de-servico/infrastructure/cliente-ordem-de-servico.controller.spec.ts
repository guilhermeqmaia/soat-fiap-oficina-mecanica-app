import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ClienteOrdemDeServicoController } from './cliente-ordem-de-servico.controller';
import { OrdemDeServicoService } from '../application/ordem-de-servico.service';
import { ClienteNotFoundError } from '../domain/errors/cliente-not-found.error';
import { ClienteNotOwnedByUsuarioError } from '../domain/errors/cliente-not-owned-by-usuario.error';

const makeUsuario = (email: string) =>
  ({ email: { value: email } }) as any;

describe('ClienteOrdemDeServicoController (US-16)', () => {
  let controller: ClienteOrdemDeServicoController;
  let service: jest.Mocked<OrdemDeServicoService>;

  beforeEach(async () => {
    const mock: Partial<jest.Mocked<OrdemDeServicoService>> = {
      findByCpfCnpj: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClienteOrdemDeServicoController],
      providers: [{ provide: OrdemDeServicoService, useValue: mock }],
    }).compile();

    controller = module.get(ClienteOrdemDeServicoController);
    service = module.get(OrdemDeServicoService);
  });

  it('returns history when CPF owned by usuario', async () => {
    service.findByCpfCnpj.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    });

    const result = await controller.findByCpfCnpj(
      '39053344705',
      { page: 1, limit: 10 },
      makeUsuario('joao@email.com'),
    );

    expect(result.total).toBe(0);
    expect(service.findByCpfCnpj).toHaveBeenCalledWith(
      '39053344705',
      'joao@email.com',
      { page: 1, limit: 10 },
    );
  });

  it('throws BadRequest on malformed CPF/CNPJ', async () => {
    await expect(
      controller.findByCpfCnpj(
        'abc.def.ghi-jk',
        {},
        makeUsuario('joao@email.com'),
      ),
    ).rejects.toThrow(BadRequestException);
    expect(service.findByCpfCnpj).not.toHaveBeenCalled();
  });

  it('maps ClienteNotFoundError to 404', async () => {
    service.findByCpfCnpj.mockRejectedValue(
      new ClienteNotFoundError('39053344705'),
    );

    await expect(
      controller.findByCpfCnpj('39053344705', {}, makeUsuario('joao@x.com')),
    ).rejects.toThrow(NotFoundException);
  });

  it('maps ClienteNotOwnedByUsuarioError to 403', async () => {
    service.findByCpfCnpj.mockRejectedValue(
      new ClienteNotOwnedByUsuarioError('39053344705'),
    );

    await expect(
      controller.findByCpfCnpj('39053344705', {}, makeUsuario('intruso@x.com')),
    ).rejects.toThrow(ForbiddenException);
  });
});
