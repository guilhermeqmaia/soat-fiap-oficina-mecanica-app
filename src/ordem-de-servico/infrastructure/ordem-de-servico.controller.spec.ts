import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { OrdemDeServicoController } from './ordem-de-servico.controller';
import { OrdemDeServicoService } from '../application/ordem-de-servico.service';
import { OrdemDeServico } from '../domain/ordem-de-servico.entity';
import { StatusOS } from '../domain/value-objects/status-os.vo';
import { ClienteNotFoundError } from '../domain/errors/cliente-not-found.error';
import { VeiculoNotFoundError } from '../domain/errors/veiculo-not-found.error';
import { VeiculoClienteMismatchError } from '../domain/errors/veiculo-cliente-mismatch.error';
import { InvalidStatusTransitionError } from '../domain/errors/invalid-status-transition.error';
import { InvalidDescricaoError } from '../domain/errors/invalid-descricao.error';
import { OsNaoEmDiagnosticoError } from '../domain/errors/os-nao-em-diagnostico.error';

const makeOs = (overrides: Partial<any> = {}) =>
  OrdemDeServico.reconstitute({
    id: 'os-uuid-123',
    numero: 'OS-2026-00001',
    clienteId: 'cliente-uuid-123',
    veiculoId: 'veiculo-uuid-456',
    usuarioId: null,
    descricaoInicial: 'Cliente relata problemas no freio',
    diagnostico: null,
    diagnosticoAt: null,
    status: StatusOS.RECEBIDA,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  });

const mockService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  adicionarDiagnostico: jest.fn(),
  atribuirMecanico: jest.fn(),
  completarDiagnostico: jest.fn(),
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

  describe('POST /ordens-servico', () => {
    const dto = {
      clienteId: 'cliente-uuid-123',
      veiculoId: 'veiculo-uuid-456',
      descricaoInicial: 'Cliente relata problemas no freio',
    };

    it('should create an OS and return mapped response', async () => {
      const os = makeOs();
      mockService.create.mockResolvedValue(os);

      const result = await controller.create(dto);

      expect(result.id).toBe('os-uuid-123');
      expect(result.status).toBe(StatusOS.RECEBIDA);
      expect(result.diagnosticoAt).toBeNull();
      expect(mockService.create).toHaveBeenCalledWith(dto);
    });

    it('should throw NotFoundException on ClienteNotFoundError', async () => {
      mockService.create.mockRejectedValue(
        new ClienteNotFoundError('cliente-uuid-123'),
      );
      await expect(controller.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException on VeiculoNotFoundError', async () => {
      mockService.create.mockRejectedValue(
        new VeiculoNotFoundError('veiculo-uuid-456'),
      );
      await expect(controller.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException on VeiculoClienteMismatchError', async () => {
      mockService.create.mockRejectedValue(
        new VeiculoClienteMismatchError('veiculo-uuid-456', 'cliente-uuid-123'),
      );
      await expect(controller.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException on InvalidDescricaoError', async () => {
      mockService.create.mockRejectedValue(
        new InvalidDescricaoError('Descricao muito curta'),
      );
      await expect(controller.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should rethrow unknown errors', async () => {
      mockService.create.mockRejectedValue(new Error('unexpected'));
      await expect(controller.create(dto)).rejects.toThrow('unexpected');
    });
  });

  describe('GET /ordens-servico', () => {
    it('should return paginated list of OS', async () => {
      mockService.findAll.mockResolvedValue({
        data: [makeOs()],
        total: 1,
        page: 1,
        limit: 10,
      });

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].diagnosticoAt).toBeNull();
    });

    it('should pass clienteId and status filters', async () => {
      mockService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      await controller.findAll({
        page: 1,
        limit: 10,
        clienteId: 'cliente-uuid-123',
        status: StatusOS.RECEBIDA,
      });

      expect(mockService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        clienteId: 'cliente-uuid-123',
        status: StatusOS.RECEBIDA,
      });
    });

    it('should use default page=1 and limit=10 when not provided', async () => {
      mockService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      await controller.findAll({});

      expect(mockService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        clienteId: undefined,
        status: undefined,
      });
    });
  });

  describe('GET /ordens-servico/:id', () => {
    it('should return OS by id', async () => {
      const os = makeOs();
      mockService.findById.mockResolvedValue(os);

      const result = await controller.findById('os-uuid-123');

      expect(result.id).toBe('os-uuid-123');
    });

    it('should propagate NotFoundException', async () => {
      mockService.findById.mockRejectedValue(new NotFoundException());
      await expect(controller.findById('os-uuid-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('PATCH /ordens-servico/:id/diagnostico', () => {
    const dto = { diagnostico: 'Pastilhas de freio desgastadas na dianteira' };

    it('should add diagnosis and return updated OS with diagnosticoAt', async () => {
      const diagnosticoAt = new Date();
      const os = makeOs({
        usuarioId: 'mecanico-uuid',
        diagnostico: dto.diagnostico,
        diagnosticoAt,
        status: StatusOS.EM_DIAGNOSTICO,
      });
      mockService.adicionarDiagnostico.mockResolvedValue(os);

      const result = await controller.adicionarDiagnostico('os-uuid-123', dto);

      expect(result.diagnostico).toBe(dto.diagnostico);
      expect(result.diagnosticoAt).toBe(diagnosticoAt);
      expect(result.status).toBe(StatusOS.EM_DIAGNOSTICO);
      expect(mockService.adicionarDiagnostico).toHaveBeenCalledWith(
        'os-uuid-123',
        dto.diagnostico,
      );
    });

    it('should throw BadRequestException on OsNaoEmDiagnosticoError', async () => {
      mockService.adicionarDiagnostico.mockRejectedValue(
        new OsNaoEmDiagnosticoError('RECEBIDA'),
      );
      await expect(
        controller.adicionarDiagnostico('os-uuid-123', dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on InvalidDescricaoError', async () => {
      mockService.adicionarDiagnostico.mockRejectedValue(
        new InvalidDescricaoError('Diagnostico muito curto'),
      );
      await expect(
        controller.adicionarDiagnostico('os-uuid-123', dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should rethrow unknown errors', async () => {
      mockService.adicionarDiagnostico.mockRejectedValue(new Error('unexpected'));
      await expect(
        controller.adicionarDiagnostico('os-uuid-123', dto),
      ).rejects.toThrow('unexpected');
    });

    it('should propagate NotFoundException when OS not found', async () => {
      mockService.adicionarDiagnostico.mockRejectedValue(new NotFoundException());
      await expect(
        controller.adicionarDiagnostico('os-uuid-123', dto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /ordens-servico/:id/atribuir-mecanico', () => {
    it('should assign mechanic and return updated OS', async () => {
      const os = makeOs({
        usuarioId: 'mecanico-uuid',
        status: StatusOS.EM_DIAGNOSTICO,
      });
      mockService.atribuirMecanico.mockResolvedValue(os);

      const result = await controller.atribuirMecanico('os-uuid-123', {
        usuarioId: 'mecanico-uuid',
      });

      expect(result.usuarioId).toBe('mecanico-uuid');
      expect(result.status).toBe(StatusOS.EM_DIAGNOSTICO);
    });

    it('should throw BadRequestException on InvalidStatusTransitionError', async () => {
      mockService.atribuirMecanico.mockRejectedValue(
        new InvalidStatusTransitionError('EM_DIAGNOSTICO', 'EM_DIAGNOSTICO'),
      );
      await expect(
        controller.atribuirMecanico('os-uuid-123', { usuarioId: 'mec' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should rethrow unknown errors', async () => {
      mockService.atribuirMecanico.mockRejectedValue(new Error('unexpected'));
      await expect(
        controller.atribuirMecanico('os-uuid-123', { usuarioId: 'mec' }),
      ).rejects.toThrow('unexpected');
    });
  });

  describe('POST /ordens-servico/:id/completar-diagnostico', () => {
    const dto = { diagnostico: 'Pastilhas desgastadas. Necessario troca.' };

    it('should complete diagnosis and return OS in AGUARDANDO_APROVACAO', async () => {
      const os = makeOs({
        diagnostico: dto.diagnostico,
        status: StatusOS.AGUARDANDO_APROVACAO,
      });
      mockService.completarDiagnostico.mockResolvedValue(os);

      const result = await controller.completarDiagnostico('os-uuid-123', dto);

      expect(result.status).toBe(StatusOS.AGUARDANDO_APROVACAO);
    });

    it('should throw BadRequestException on InvalidStatusTransitionError', async () => {
      mockService.completarDiagnostico.mockRejectedValue(
        new InvalidStatusTransitionError('RECEBIDA', 'AGUARDANDO_APROVACAO'),
      );
      await expect(
        controller.completarDiagnostico('os-uuid-123', dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on InvalidDescricaoError', async () => {
      mockService.completarDiagnostico.mockRejectedValue(
        new InvalidDescricaoError('Diagnostico invalido'),
      );
      await expect(
        controller.completarDiagnostico('os-uuid-123', dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should rethrow unknown errors', async () => {
      mockService.completarDiagnostico.mockRejectedValue(new Error('unexpected'));
      await expect(
        controller.completarDiagnostico('os-uuid-123', dto),
      ).rejects.toThrow('unexpected');
    });
  });

  describe('POST /ordens-servico/:id/aprovar-orcamento', () => {
    it('should approve budget and return OS in EM_EXECUCAO', async () => {
      const os = makeOs({ status: StatusOS.EM_EXECUCAO });
      mockService.aprovarOrcamento.mockResolvedValue(os);

      const result = await controller.aprovarOrcamento('os-uuid-123');

      expect(result.status).toBe(StatusOS.EM_EXECUCAO);
    });

    it('should throw BadRequestException on InvalidStatusTransitionError', async () => {
      mockService.aprovarOrcamento.mockRejectedValue(
        new InvalidStatusTransitionError('RECEBIDA', 'EM_EXECUCAO'),
      );
      await expect(controller.aprovarOrcamento('os-uuid-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should rethrow unknown errors', async () => {
      mockService.aprovarOrcamento.mockRejectedValue(new Error('unexpected'));
      await expect(controller.aprovarOrcamento('os-uuid-123')).rejects.toThrow(
        'unexpected',
      );
    });
  });

  describe('POST /ordens-servico/:id/rejeitar-orcamento', () => {
    it('should reject budget and return OS in CANCELADA', async () => {
      const os = makeOs({ status: StatusOS.CANCELADA });
      mockService.rejeitarOrcamento.mockResolvedValue(os);

      const result = await controller.rejeitarOrcamento('os-uuid-123');

      expect(result.status).toBe(StatusOS.CANCELADA);
    });

    it('should throw BadRequestException on InvalidStatusTransitionError', async () => {
      mockService.rejeitarOrcamento.mockRejectedValue(
        new InvalidStatusTransitionError('RECEBIDA', 'CANCELADA'),
      );
      await expect(controller.rejeitarOrcamento('os-uuid-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should rethrow unknown errors', async () => {
      mockService.rejeitarOrcamento.mockRejectedValue(new Error('unexpected'));
      await expect(controller.rejeitarOrcamento('os-uuid-123')).rejects.toThrow(
        'unexpected',
      );
    });
  });

  describe('POST /ordens-servico/:id/finalizar-execucao', () => {
    it('should finalize execution and return OS in FINALIZADA', async () => {
      const os = makeOs({ status: StatusOS.FINALIZADA });
      mockService.finalizarExecucao.mockResolvedValue(os);

      const result = await controller.finalizarExecucao('os-uuid-123');

      expect(result.status).toBe(StatusOS.FINALIZADA);
    });

    it('should throw BadRequestException on InvalidStatusTransitionError', async () => {
      mockService.finalizarExecucao.mockRejectedValue(
        new InvalidStatusTransitionError('RECEBIDA', 'FINALIZADA'),
      );
      await expect(controller.finalizarExecucao('os-uuid-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should rethrow unknown errors', async () => {
      mockService.finalizarExecucao.mockRejectedValue(new Error('unexpected'));
      await expect(controller.finalizarExecucao('os-uuid-123')).rejects.toThrow(
        'unexpected',
      );
    });
  });

  describe('POST /ordens-servico/:id/entregar', () => {
    it('should deliver vehicle and return OS in ENTREGUE', async () => {
      const os = makeOs({ status: StatusOS.ENTREGUE });
      mockService.entregar.mockResolvedValue(os);

      const result = await controller.entregar('os-uuid-123');

      expect(result.status).toBe(StatusOS.ENTREGUE);
    });

    it('should throw BadRequestException on InvalidStatusTransitionError', async () => {
      mockService.entregar.mockRejectedValue(
        new InvalidStatusTransitionError('RECEBIDA', 'ENTREGUE'),
      );
      await expect(controller.entregar('os-uuid-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should rethrow unknown errors', async () => {
      mockService.entregar.mockRejectedValue(new Error('unexpected'));
      await expect(controller.entregar('os-uuid-123')).rejects.toThrow('unexpected');
    });
  });

  describe('DELETE /ordens-servico/:id', () => {
    it('should delete OS', async () => {
      mockService.delete.mockResolvedValue(undefined);

      await controller.delete('os-uuid-123');

      expect(mockService.delete).toHaveBeenCalledWith('os-uuid-123');
    });

    it('should propagate NotFoundException', async () => {
      mockService.delete.mockRejectedValue(new NotFoundException());
      await expect(controller.delete('os-uuid-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
