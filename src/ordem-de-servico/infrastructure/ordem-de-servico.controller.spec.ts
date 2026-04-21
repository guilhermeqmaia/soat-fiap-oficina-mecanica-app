import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { OrdemDeServicoController } from './ordem-de-servico.controller';
import { OrdemDeServicoService } from '../application/ordem-de-servico.service';
import { OrdemDeServico } from '../domain/ordem-de-servico.entity';
import { StatusOS } from '../domain/value-objects/status-os.vo';
import { ClienteNotFoundError } from '../domain/errors/cliente-not-found.error';
import { VeiculoNotFoundError } from '../domain/errors/veiculo-not-found.error';
import { VeiculoClienteMismatchError } from '../domain/errors/veiculo-cliente-mismatch.error';
import { InvalidStatusTransitionError } from '../domain/errors/invalid-status-transition.error';
import { InvalidDescriptionError } from '../domain/errors/invalid-description.error';
import { OsNotOwnedByClienteError } from '../domain/errors/os-not-owned-by-cliente.error';
import { Role } from '../../auth/domain/role.enum';
import { Usuario } from '../../auth/domain/usuario.entity';

const mockOs = OrdemDeServico.reconstitute({
  id: 'os-123',
  numero: 'OS-2026-00001',
  clienteId: 'cliente-123',
  veiculoId: 'veiculo-456',
  usuarioId: null,
  descricaoInicial: 'Cliente relata problemas no freio',
  diagnostico: null,
  status: StatusOS.RECEBIDA,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
});

const mockService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  atribuirMecanico: jest.fn(),
  completarDiagnostico: jest.fn(),
  assertOsPertenceAoCliente: jest.fn(),
  aprovarOrcamento: jest.fn(),
  rejeitarOrcamento: jest.fn(),
  finalizarExecucao: jest.fn(),
  entregar: jest.fn(),
  delete: jest.fn(),
};

describe('OrdemDeServicoController', () => {
  let controller: OrdemDeServicoController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdemDeServicoController],
      providers: [{ provide: OrdemDeServicoService, useValue: mockService }],
    }).compile();

    controller = module.get<OrdemDeServicoController>(OrdemDeServicoController);
  });

  // ==================== POST /ordens-servico ====================

  describe('create', () => {
    const dto = {
      clienteId: 'cliente-123',
      veiculoId: 'veiculo-456',
      descricaoInicial: 'Cliente relata problemas no freio',
    };

    it('should create and return an OS response', async () => {
      mockService.create.mockResolvedValue(mockOs);

      const result = await controller.create(dto);

      expect(result.id).toBe('os-123');
      expect(result.status).toBe(StatusOS.RECEBIDA);
      expect(mockService.create).toHaveBeenCalledWith(dto);
    });

    it('should throw NotFoundException for ClienteNotFoundError', async () => {
      mockService.create.mockRejectedValue(new ClienteNotFoundError('cliente-123'));
      await expect(controller.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for VeiculoNotFoundError', async () => {
      mockService.create.mockRejectedValue(new VeiculoNotFoundError('veiculo-456'));
      await expect(controller.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for VeiculoClienteMismatchError', async () => {
      mockService.create.mockRejectedValue(
        new VeiculoClienteMismatchError('veiculo-456', 'cliente-123'),
      );
      await expect(controller.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for InvalidDescriptionError', async () => {
      mockService.create.mockRejectedValue(new InvalidDescriptionError('curta'));
      await expect(controller.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should rethrow unknown errors', async () => {
      mockService.create.mockRejectedValue(new Error('unexpected'));
      await expect(controller.create(dto)).rejects.toThrow('unexpected');
    });
  });

  // ==================== GET /ordens-servico ====================

  describe('findAll', () => {
    it('should return paginated OS list', async () => {
      mockService.findAll.mockResolvedValue({
        data: [mockOs],
        total: 1,
        page: 1,
        limit: 10,
      });

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should use default pagination when page and limit are undefined', async () => {
      mockService.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 });

      await controller.findAll({});

      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10 }),
      );
    });

    it('should pass optional filters', async () => {
      mockService.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 });

      await controller.findAll({
        page: 2,
        limit: 5,
        clienteId: 'cliente-123',
        status: 'RECEBIDA',
        numero: 'OS-001',
      });

      expect(mockService.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        clienteId: 'cliente-123',
        status: 'RECEBIDA',
        numero: 'OS-001',
      });
    });
  });

  // ==================== GET /ordens-servico/:id ====================

  describe('findById', () => {
    it('should return OS response when found', async () => {
      mockService.findById.mockResolvedValue(mockOs);

      const result = await controller.findById('os-123');

      expect(result.id).toBe('os-123');
      expect(mockService.findById).toHaveBeenCalledWith('os-123');
    });
  });

  // ==================== POST /ordens-servico/:id/atribuir-mecanico ====================

  describe('atribuirMecanico', () => {
    it('should assign mechanic successfully', async () => {
      mockService.atribuirMecanico.mockResolvedValue(mockOs);

      const result = await controller.atribuirMecanico('os-123', { usuarioId: 'user-789' });

      expect(result).toBeDefined();
      expect(mockService.atribuirMecanico).toHaveBeenCalledWith('os-123', 'user-789');
    });

    it('should throw BadRequestException for InvalidStatusTransitionError', async () => {
      mockService.atribuirMecanico.mockRejectedValue(
        new InvalidStatusTransitionError(StatusOS.RECEBIDA, StatusOS.EM_EXECUCAO),
      );
      await expect(
        controller.atribuirMecanico('os-123', { usuarioId: 'user-789' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should rethrow unknown errors in atribuirMecanico', async () => {
      mockService.atribuirMecanico.mockRejectedValue(new Error('unexpected'));
      await expect(
        controller.atribuirMecanico('os-123', { usuarioId: 'user-789' }),
      ).rejects.toThrow('unexpected');
    });
  });

  // ==================== POST /ordens-servico/:id/completar-diagnostico ====================

  describe('completarDiagnostico', () => {
    it('should complete diagnosis successfully', async () => {
      mockService.completarDiagnostico.mockResolvedValue(mockOs);

      const result = await controller.completarDiagnostico('os-123', {
        diagnostico: 'Pastilhas desgastadas',
      });

      expect(result).toBeDefined();
    });

    it('should throw BadRequestException for InvalidStatusTransitionError', async () => {
      mockService.completarDiagnostico.mockRejectedValue(
        new InvalidStatusTransitionError(StatusOS.RECEBIDA, StatusOS.AGUARDANDO_APROVACAO),
      );
      await expect(
        controller.completarDiagnostico('os-123', { diagnostico: 'teste' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for InvalidDescriptionError in diagnostico', async () => {
      mockService.completarDiagnostico.mockRejectedValue(
        new InvalidDescriptionError('muito curto'),
      );
      await expect(
        controller.completarDiagnostico('os-123', { diagnostico: 'ab' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should rethrow unknown errors in completarDiagnostico', async () => {
      mockService.completarDiagnostico.mockRejectedValue(new Error('unexpected'));
      await expect(
        controller.completarDiagnostico('os-123', { diagnostico: 'Pastilhas' }),
      ).rejects.toThrow('unexpected');
    });
  });

  // ==================== POST /ordens-servico/:id/aprovar-orcamento ====================

  describe('aprovarOrcamento', () => {
    it('should approve budget as ADMIN (no ownership check)', async () => {
      mockService.aprovarOrcamento.mockResolvedValue(mockOs);

      const adminUser = Usuario.reconstitute({
        id: 'admin-id',
        nome: 'Admin',
        email: 'admin@test.com',
        senhaHash: 'hash',
        role: Role.ADMIN,
        ativo: true,
      });

      const result = await controller.aprovarOrcamento('os-123', adminUser);

      expect(result).toBeDefined();
      expect(mockService.assertOsPertenceAoCliente).not.toHaveBeenCalled();
    });

    it('should approve budget as CLIENTE (with ownership check)', async () => {
      mockService.assertOsPertenceAoCliente.mockResolvedValue(undefined);
      mockService.aprovarOrcamento.mockResolvedValue(mockOs);

      const clienteUser = Usuario.reconstitute({
        id: 'cliente-id',
        nome: 'Cliente',
        email: 'cliente@test.com',
        senhaHash: 'hash',
        role: Role.CLIENTE,
        ativo: true,
      });

      const result = await controller.aprovarOrcamento('os-123', clienteUser);

      expect(result).toBeDefined();
      expect(mockService.assertOsPertenceAoCliente).toHaveBeenCalledWith(
        'os-123',
        'cliente@test.com',
      );
    });

    it('should throw ForbiddenException for OsNotOwnedByClienteError', async () => {
      mockService.assertOsPertenceAoCliente.mockRejectedValue(
        new OsNotOwnedByClienteError('os-123'),
      );

      const clienteUser = Usuario.reconstitute({
        id: 'cliente-id',
        nome: 'Cliente',
        email: 'outro@test.com',
        senhaHash: 'hash',
        role: Role.CLIENTE,
        ativo: true,
      });

      await expect(
        controller.aprovarOrcamento('os-123', clienteUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for InvalidStatusTransitionError in aprovar', async () => {
      mockService.assertOsPertenceAoCliente.mockResolvedValue(undefined);
      mockService.aprovarOrcamento.mockRejectedValue(
        new InvalidStatusTransitionError(StatusOS.RECEBIDA, StatusOS.EM_EXECUCAO),
      );

      const clienteUser = Usuario.reconstitute({
        id: 'cliente-id',
        nome: 'Cliente',
        email: 'cliente@test.com',
        senhaHash: 'hash',
        role: Role.CLIENTE,
        ativo: true,
      });

      await expect(
        controller.aprovarOrcamento('os-123', clienteUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should rethrow unknown errors in aprovarOrcamento', async () => {
      mockService.aprovarOrcamento.mockRejectedValue(new Error('unexpected'));

      const adminUser = Usuario.reconstitute({
        id: 'admin-id',
        nome: 'Admin',
        email: 'admin@test.com',
        senhaHash: 'hash',
        role: Role.ADMIN,
        ativo: true,
      });

      await expect(
        controller.aprovarOrcamento('os-123', adminUser),
      ).rejects.toThrow('unexpected');
    });
  });

  // ==================== POST /ordens-servico/:id/rejeitar-orcamento ====================

  describe('rejeitarOrcamento', () => {
    it('should reject budget as ADMIN (no ownership check)', async () => {
      mockService.rejeitarOrcamento.mockResolvedValue(mockOs);

      const adminUser = Usuario.reconstitute({
        id: 'admin-id',
        nome: 'Admin',
        email: 'admin@test.com',
        senhaHash: 'hash',
        role: Role.ADMIN,
        ativo: true,
      });

      const result = await controller.rejeitarOrcamento('os-123', adminUser);

      expect(result).toBeDefined();
      expect(mockService.assertOsPertenceAoCliente).not.toHaveBeenCalled();
    });

    it('should reject budget as CLIENTE (with ownership check)', async () => {
      mockService.assertOsPertenceAoCliente.mockResolvedValue(undefined);
      mockService.rejeitarOrcamento.mockResolvedValue(mockOs);

      const clienteUser = Usuario.reconstitute({
        id: 'cliente-id',
        nome: 'Cliente',
        email: 'cliente@test.com',
        senhaHash: 'hash',
        role: Role.CLIENTE,
        ativo: true,
      });

      const result = await controller.rejeitarOrcamento('os-123', clienteUser);

      expect(result).toBeDefined();
      expect(mockService.assertOsPertenceAoCliente).toHaveBeenCalledWith(
        'os-123',
        'cliente@test.com',
      );
    });

    it('should throw ForbiddenException for OsNotOwnedByClienteError in rejeitar', async () => {
      mockService.assertOsPertenceAoCliente.mockRejectedValue(
        new OsNotOwnedByClienteError('os-123'),
      );

      const clienteUser = Usuario.reconstitute({
        id: 'cliente-id',
        nome: 'Cliente',
        email: 'outro@test.com',
        senhaHash: 'hash',
        role: Role.CLIENTE,
        ativo: true,
      });

      await expect(
        controller.rejeitarOrcamento('os-123', clienteUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for InvalidStatusTransitionError in rejeitar', async () => {
      mockService.assertOsPertenceAoCliente.mockResolvedValue(undefined);
      mockService.rejeitarOrcamento.mockRejectedValue(
        new InvalidStatusTransitionError(StatusOS.RECEBIDA, StatusOS.CANCELADA),
      );

      const clienteUser = Usuario.reconstitute({
        id: 'cliente-id',
        nome: 'Cliente',
        email: 'cliente@test.com',
        senhaHash: 'hash',
        role: Role.CLIENTE,
        ativo: true,
      });

      await expect(
        controller.rejeitarOrcamento('os-123', clienteUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should rethrow unknown errors in rejeitarOrcamento', async () => {
      mockService.rejeitarOrcamento.mockRejectedValue(new Error('unexpected'));

      const adminUser = Usuario.reconstitute({
        id: 'admin-id',
        nome: 'Admin',
        email: 'admin@test.com',
        senhaHash: 'hash',
        role: Role.ADMIN,
        ativo: true,
      });

      await expect(
        controller.rejeitarOrcamento('os-123', adminUser),
      ).rejects.toThrow('unexpected');
    });
  });

  // ==================== POST /ordens-servico/:id/finalizar-execucao ====================

  describe('finalizarExecucao', () => {
    it('should finalize execution successfully', async () => {
      mockService.finalizarExecucao.mockResolvedValue(mockOs);

      const result = await controller.finalizarExecucao('os-123');

      expect(result).toBeDefined();
    });

    it('should throw BadRequestException for InvalidStatusTransitionError', async () => {
      mockService.finalizarExecucao.mockRejectedValue(
        new InvalidStatusTransitionError(StatusOS.RECEBIDA, StatusOS.FINALIZADA),
      );
      await expect(controller.finalizarExecucao('os-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should rethrow unknown errors in finalizarExecucao', async () => {
      mockService.finalizarExecucao.mockRejectedValue(new Error('unexpected'));
      await expect(controller.finalizarExecucao('os-123')).rejects.toThrow('unexpected');
    });
  });

  // ==================== POST /ordens-servico/:id/entregar ====================

  describe('entregar', () => {
    it('should deliver vehicle successfully', async () => {
      mockService.entregar.mockResolvedValue(mockOs);

      const result = await controller.entregar('os-123');

      expect(result).toBeDefined();
    });

    it('should throw BadRequestException for InvalidStatusTransitionError in entregar', async () => {
      mockService.entregar.mockRejectedValue(
        new InvalidStatusTransitionError(StatusOS.RECEBIDA, StatusOS.ENTREGUE),
      );
      await expect(controller.entregar('os-123')).rejects.toThrow(BadRequestException);
    });

    it('should rethrow unknown errors in entregar', async () => {
      mockService.entregar.mockRejectedValue(new Error('unexpected'));
      await expect(controller.entregar('os-123')).rejects.toThrow('unexpected');
    });
  });

  // ==================== DELETE /ordens-servico/:id ====================

  describe('delete', () => {
    it('should delete OS successfully', async () => {
      mockService.delete.mockResolvedValue(undefined);

      await controller.delete('os-123');

      expect(mockService.delete).toHaveBeenCalledWith('os-123');
    });
  });
});
