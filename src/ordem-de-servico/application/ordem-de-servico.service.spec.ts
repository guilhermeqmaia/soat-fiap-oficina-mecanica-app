import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OrdemDeServicoService } from './ordem-de-servico.service';
import {
  ORDEM_DE_SERVICO_REPOSITORY,
  OrdemDeServicoRepository,
} from '../domain/ordem-de-servico.repository';
import { ClienteNotFoundError } from '../domain/errors/cliente-not-found.error';
import { VeiculoNotFoundError } from '../domain/errors/veiculo-not-found.error';
import { VeiculoClienteMismatchError } from '../domain/errors/veiculo-cliente-mismatch.error';
import { CLIENTE_REPOSITORY, ClienteRepository } from '../../cliente/domain/cliente.repository';
import { VEICULO_REPOSITORY, VeiculoRepository } from '../../veiculo/domain/veiculo.repository';
import { ProdutoService } from '../../produto/application/produto.service';
import { OrdemDeServico } from '../domain/ordem-de-servico.entity';
import { StatusOS } from '../domain/value-objects/status-os.vo';

describe('OrdemDeServicoService', () => {
  let service: OrdemDeServicoService;
  let repository: jest.Mocked<OrdemDeServicoRepository>;
  let clienteRepository: jest.Mocked<ClienteRepository>;
  let veiculoRepository: jest.Mocked<VeiculoRepository>;

  beforeEach(async () => {
    const mockOrdemRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByNumero: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      existsByNumero: jest.fn(),
    };

    const mockClienteRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      existsByCpfCnpj: jest.fn(),
    };

    const mockVeiculoRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      existsByPlaca: jest.fn(),
      findByClienteId: jest.fn(),
    };

    const mockProdutoService = {
      findById: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      reserveStock: jest.fn(),
      releaseStock: jest.fn(),
      addStock: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdemDeServicoService,
        {
          provide: ORDEM_DE_SERVICO_REPOSITORY,
          useValue: mockOrdemRepository,
        },
        {
          provide: CLIENTE_REPOSITORY,
          useValue: mockClienteRepository,
        },
        {
          provide: VEICULO_REPOSITORY,
          useValue: mockVeiculoRepository,
        },
        {
          provide: ProdutoService,
          useValue: mockProdutoService,
        },
      ],
    }).compile();

    service = module.get<OrdemDeServicoService>(OrdemDeServicoService);
    repository = module.get<jest.Mocked<OrdemDeServicoRepository>>(
      ORDEM_DE_SERVICO_REPOSITORY,
    );
    clienteRepository = module.get<jest.Mocked<ClienteRepository>>(
      CLIENTE_REPOSITORY,
    );
    veiculoRepository = module.get<jest.Mocked<VeiculoRepository>>(
      VEICULO_REPOSITORY,
    );
  });

  describe('create', () => {
    it('should create a new ordem de servico', async () => {
      const cliente: any = {
        id: 'cliente-123',
        nome: 'João',
        cpfCnpj: '12345678901',
        telefone: '1199999999',
        email: 'joao@email.com',
      };

      const veiculo: any = {
        id: 'veiculo-456',
        placa: 'ABC1D23',
        marca: 'Toyota',
        modelo: 'Corolla',
        ano: 2024,
        clienteId: 'cliente-123',
        ativo: true,
      };

      const osEntity = OrdemDeServico.create({
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        descricaoInicial: 'Cliente relata problemas no freio',
      });

      clienteRepository.findById.mockResolvedValue(cliente);
      veiculoRepository.findById.mockResolvedValue(veiculo);
      repository.create.mockResolvedValue(osEntity);

      const result = await service.create({
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        descricaoInicial: 'Cliente relata problemas no freio',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe(StatusOS.RECEBIDA);
      expect(clienteRepository.findById).toHaveBeenCalledWith('cliente-123');
      expect(veiculoRepository.findById).toHaveBeenCalledWith('veiculo-456');
      expect(repository.create).toHaveBeenCalled();
    });

    it('should throw ClienteNotFoundError if cliente does not exist', async () => {
      clienteRepository.findById.mockResolvedValue(null);

      await expect(
        service.create({
          clienteId: 'inexistent-cliente',
          veiculoId: 'veiculo-456',
          descricaoInicial: 'Cliente relata problemas no freio',
        }),
      ).rejects.toThrow(ClienteNotFoundError);
    });

    it('should throw VeiculoNotFoundError if veiculo does not exist', async () => {
      const cliente: any = {
        id: 'cliente-123',
        nome: 'João',
        cpfCnpj: '12345678901',
        telefone: '1199999999',
        email: 'joao@email.com',
      };

      clienteRepository.findById.mockResolvedValue(cliente);
      veiculoRepository.findById.mockResolvedValue(null);

      await expect(
        service.create({
          clienteId: 'cliente-123',
          veiculoId: 'inexistent-veiculo',
          descricaoInicial: 'Cliente relata problemas no freio',
        }),
      ).rejects.toThrow(VeiculoNotFoundError);
    });

    it('should throw VeiculoClienteMismatchError if veiculo does not belong to cliente', async () => {
      const cliente: any = {
        id: 'cliente-123',
        nome: 'João',
        cpfCnpj: '12345678901',
        telefone: '1199999999',
        email: 'joao@email.com',
      };

      const veiculo: any = {
        id: 'veiculo-456',
        placa: 'ABC1D23',
        marca: 'Toyota',
        modelo: 'Corolla',
        ano: 2024,
        clienteId: 'outro-cliente',
        ativo: true,
      };

      clienteRepository.findById.mockResolvedValue(cliente);
      veiculoRepository.findById.mockResolvedValue(veiculo);

      await expect(
        service.create({
          clienteId: 'cliente-123',
          veiculoId: 'veiculo-456',
          descricaoInicial: 'Cliente relata problemas no freio',
        }),
      ).rejects.toThrow(VeiculoClienteMismatchError);
    });
  });

  describe('findById', () => {
    it('should find ordem de servico by id', async () => {
      const osEntity = OrdemDeServico.reconstitute({
        id: 'os-123',
        numero: 'OS-2026-00001',
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        usuarioId: null,
        descricaoInicial: 'Cliente relata problemas no freio',
        diagnostico: null,
        status: StatusOS.RECEBIDA,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      repository.findById.mockResolvedValue(osEntity);

      const result = await service.findById('os-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('os-123');
      expect(repository.findById).toHaveBeenCalledWith('os-123');
    });

    it('should throw NotFoundException if ordem de servico does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('inexistent-os')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should find all ordens de servico with pagination', async () => {
      const osEntity = OrdemDeServico.reconstitute({
        id: 'os-123',
        numero: 'OS-2026-00001',
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        usuarioId: null,
        descricaoInicial: 'Cliente relata problemas no freio',
        diagnostico: null,
        status: StatusOS.RECEBIDA,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = {
        data: [osEntity],
        total: 1,
        page: 1,
        limit: 10,
      };

      repository.findAll.mockResolvedValue(result);

      const response = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(response.data).toHaveLength(1);
      expect(response.total).toBe(1);
      expect(repository.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
    });

    it('should filter by clienteId', async () => {
      repository.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      await service.findAll({
        page: 1,
        limit: 10,
        clienteId: 'cliente-123',
      });

      expect(repository.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        clienteId: 'cliente-123',
      });
    });

    it('should filter by status', async () => {
      repository.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      await service.findAll({
        page: 1,
        limit: 10,
        status: StatusOS.RECEBIDA,
      });

      expect(repository.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        status: StatusOS.RECEBIDA,
      });
    });
  });

  describe('atribuirMecanico', () => {
    it('should assign mechanic to ordem de servico', async () => {
      const osEntity = OrdemDeServico.create({
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        descricaoInicial: 'Cliente relata problemas no freio',
      });

      repository.findById.mockResolvedValue(osEntity);
      repository.update.mockResolvedValue(osEntity);

      const result = await service.atribuirMecanico('os-123', 'usuario-789');

      expect(result).toBeDefined();
      expect(repository.findById).toHaveBeenCalledWith('os-123');
      expect(repository.update).toHaveBeenCalled();
    });
  });

  describe('completarDiagnostico', () => {
    it('should complete diagnosis', async () => {
      const osEntity = OrdemDeServico.create({
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        descricaoInicial: 'Cliente relata problemas no freio',
      });
      osEntity.atribuirMecanico('usuario-789');

      repository.findById.mockResolvedValue(osEntity);
      repository.update.mockResolvedValue(osEntity);

      const result = await service.completarDiagnostico(
        'os-123',
        'Pastilhas desgastadas. Necessario troca.',
      );

      expect(result).toBeDefined();
      expect(repository.update).toHaveBeenCalled();
    });
  });

  describe('aprovarOrcamento', () => {
    it('should approve budget', async () => {
      const osEntity = OrdemDeServico.reconstitute({
        id: 'os-123',
        numero: 'OS-2026-00001',
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        usuarioId: 'usuario-789',
        descricaoInicial: 'Cliente relata problemas no freio',
        diagnostico: 'Pastilhas desgastadas',
        status: StatusOS.AGUARDANDO_APROVACAO,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      repository.findById.mockResolvedValue(osEntity);
      repository.update.mockResolvedValue(osEntity);

      const result = await service.aprovarOrcamento('os-123');

      expect(result).toBeDefined();
      expect(repository.update).toHaveBeenCalled();
    });
  });

  describe('rejeitarOrcamento', () => {
    it('should reject budget', async () => {
      const osEntity = OrdemDeServico.reconstitute({
        id: 'os-123',
        numero: 'OS-2026-00001',
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        usuarioId: 'usuario-789',
        descricaoInicial: 'Cliente relata problemas no freio',
        diagnostico: 'Pastilhas desgastadas',
        status: StatusOS.AGUARDANDO_APROVACAO,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      repository.findById.mockResolvedValue(osEntity);
      repository.update.mockResolvedValue(osEntity);

      const result = await service.rejeitarOrcamento('os-123');

      expect(result).toBeDefined();
      expect(repository.update).toHaveBeenCalled();
    });
  });

  describe('finalizarExecucao', () => {
    it('should finalize execution', async () => {
      const osEntity = OrdemDeServico.reconstitute({
        id: 'os-123',
        numero: 'OS-2026-00001',
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        usuarioId: 'usuario-789',
        descricaoInicial: 'Cliente relata problemas no freio',
        diagnostico: 'Pastilhas desgastadas',
        status: StatusOS.EM_EXECUCAO,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      repository.findById.mockResolvedValue(osEntity);
      repository.update.mockResolvedValue(osEntity);

      const result = await service.finalizarExecucao('os-123');

      expect(result).toBeDefined();
      expect(repository.update).toHaveBeenCalled();
    });
  });

  describe('entregar', () => {
    it('should deliver vehicle', async () => {
      const osEntity = OrdemDeServico.reconstitute({
        id: 'os-123',
        numero: 'OS-2026-00001',
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        usuarioId: 'usuario-789',
        descricaoInicial: 'Cliente relata problemas no freio',
        diagnostico: 'Pastilhas desgastadas',
        status: StatusOS.FINALIZADA,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      repository.findById.mockResolvedValue(osEntity);
      repository.update.mockResolvedValue(osEntity);

      const result = await service.entregar('os-123');

      expect(result).toBeDefined();
      expect(repository.update).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete ordem de servico', async () => {
      const osEntity = OrdemDeServico.create({
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        descricaoInicial: 'Cliente relata problemas no freio',
      });

      repository.findById.mockResolvedValue(osEntity);
      repository.delete.mockResolvedValue(undefined);

      await service.delete('os-123');

      expect(repository.findById).toHaveBeenCalledWith('os-123');
      expect(repository.delete).toHaveBeenCalled();
    });
  });
});
