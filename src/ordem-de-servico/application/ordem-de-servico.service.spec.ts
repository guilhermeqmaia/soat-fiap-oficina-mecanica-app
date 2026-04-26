import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrdemDeServicoService } from './ordem-de-servico.service';
import {
  ORDEM_DE_SERVICO_REPOSITORY,
  OrdemDeServicoRepository,
} from '../domain/ordem-de-servico.repository';
import { ClienteNotFoundError } from '../domain/errors/cliente-not-found.error';
import { VeiculoNotFoundError } from '../domain/errors/veiculo-not-found.error';
import { VeiculoClienteMismatchError } from '../domain/errors/veiculo-cliente-mismatch.error';
import { OsNotOwnedByClienteError } from '../domain/errors/os-not-owned-by-cliente.error';
import { ServicoNotFoundInCatalogError } from '../domain/errors/servico-not-found-in-catalog.error';
import { ServicoAlreadyAddedError } from '../domain/errors/servico-already-added.error';
import { OrdemDeServicoNotFoundError } from '../domain/errors/ordem-de-servico-not-found.error';
import { ClienteNotOwnedByUsuarioError } from '../domain/errors/cliente-not-owned-by-usuario.error';
import { ItemServicoOS } from '../domain/value-objects/item-servico-os.vo';
import { CLIENTE_REPOSITORY, ClienteRepository } from '../../cliente/domain/cliente.repository';
import { VEICULO_REPOSITORY, VeiculoRepository } from '../../veiculo/domain/veiculo.repository';
import { SERVICO_REPOSITORY, ServicoRepository } from '../../servico/domain/servico.repository';
import { OrdemDeServico } from '../domain/ordem-de-servico.entity';
import { StatusOS } from '../domain/value-objects/status-os.vo';

describe('OrdemDeServicoService', () => {
  let service: OrdemDeServicoService;
  let repository: jest.Mocked<OrdemDeServicoRepository>;
  let clienteRepository: jest.Mocked<ClienteRepository>;
  let veiculoRepository: jest.Mocked<VeiculoRepository>;
  let servicoRepository: jest.Mocked<ServicoRepository>;

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
      findByCpfCnpj: jest.fn(),
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

    const mockServicoRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      existsByNome: jest.fn(),
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
          provide: SERVICO_REPOSITORY,
          useValue: mockServicoRepository,
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
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
    servicoRepository = module.get<jest.Mocked<ServicoRepository>>(
      SERVICO_REPOSITORY,
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

  describe('assertOsPertenceAoCliente', () => {
    const makeOs = () =>
      OrdemDeServico.reconstitute({
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

    it('should pass when client email matches', async () => {
      const os = makeOs();
      const cliente: any = { id: 'cliente-123', email: 'joao@email.com' };

      repository.findById.mockResolvedValue(os);
      clienteRepository.findById.mockResolvedValue(cliente);

      await expect(
        service.assertOsPertenceAoCliente('os-123', 'joao@email.com'),
      ).resolves.toBeUndefined();
    });

    it('should pass when email comparison is case-insensitive', async () => {
      const os = makeOs();
      const cliente: any = { id: 'cliente-123', email: 'JOAO@EMAIL.COM' };

      repository.findById.mockResolvedValue(os);
      clienteRepository.findById.mockResolvedValue(cliente);

      await expect(
        service.assertOsPertenceAoCliente('os-123', 'joao@email.com'),
      ).resolves.toBeUndefined();
    });

    it('should throw OsNotOwnedByClienteError when cliente is null', async () => {
      const os = makeOs();

      repository.findById.mockResolvedValue(os);
      clienteRepository.findById.mockResolvedValue(null);

      await expect(
        service.assertOsPertenceAoCliente('os-123', 'joao@email.com'),
      ).rejects.toThrow(OsNotOwnedByClienteError);
    });

    it('should throw OsNotOwnedByClienteError when cliente has no email', async () => {
      const os = makeOs();
      const cliente: any = { id: 'cliente-123', email: null };

      repository.findById.mockResolvedValue(os);
      clienteRepository.findById.mockResolvedValue(cliente);

      await expect(
        service.assertOsPertenceAoCliente('os-123', 'joao@email.com'),
      ).rejects.toThrow(OsNotOwnedByClienteError);
    });

    it('should throw OsNotOwnedByClienteError when email does not match', async () => {
      const os = makeOs();
      const cliente: any = { id: 'cliente-123', email: 'outro@email.com' };

      repository.findById.mockResolvedValue(os);
      clienteRepository.findById.mockResolvedValue(cliente);

      await expect(
        service.assertOsPertenceAoCliente('os-123', 'joao@email.com'),
      ).rejects.toThrow(OsNotOwnedByClienteError);
    });
  });

  describe('adicionarServico', () => {
    const makeOsEmDiagnostico = () =>
      OrdemDeServico.reconstitute({
        id: 'os-123',
        numero: 'OS-2026-00001',
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        usuarioId: 'usuario-789',
        descricaoInicial: 'Cliente relata problemas no freio',
        diagnostico: null,
        status: StatusOS.EM_DIAGNOSTICO,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    it('should add service using snapshot of current precoBase', async () => {
      const os = makeOsEmDiagnostico();
      const servico: any = { id: 'servico-1', precoBase: { value: 75 } };

      repository.findById.mockResolvedValue(os);
      servicoRepository.findById.mockResolvedValue(servico);
      repository.update.mockResolvedValue(os);

      await service.adicionarServico('os-123', 'servico-1', 2);

      expect(servicoRepository.findById).toHaveBeenCalledWith('servico-1');
      expect(os.itensServico).toHaveLength(1);
      expect(os.itensServico[0].precoUnitario).toBe(75);
      expect(os.valorTotalServicos()).toBe(150);
      expect(repository.update).toHaveBeenCalledWith(os);
    });

    it('should throw when servico is not in catalog', async () => {
      const os = makeOsEmDiagnostico();

      repository.findById.mockResolvedValue(os);
      servicoRepository.findById.mockResolvedValue(null);

      await expect(
        service.adicionarServico('os-123', 'servico-x', 1),
      ).rejects.toThrow(ServicoNotFoundInCatalogError);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should propagate ServicoAlreadyAddedError from aggregate', async () => {
      const os = makeOsEmDiagnostico();
      const servico: any = { id: 'servico-1', precoBase: { value: 10 } };

      repository.findById.mockResolvedValue(os);
      servicoRepository.findById.mockResolvedValue(servico);
      repository.update.mockResolvedValue(os);

      await service.adicionarServico('os-123', 'servico-1', 1);
      await expect(
        service.adicionarServico('os-123', 'servico-1', 1),
      ).rejects.toThrow(ServicoAlreadyAddedError);
    });
  });

  describe('removerServico', () => {
    it('should remove service and persist', async () => {
      const os = OrdemDeServico.reconstitute({
        id: 'os-123',
        numero: 'OS-2026-00001',
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        usuarioId: 'usuario-789',
        descricaoInicial: 'Cliente relata problemas no freio',
        diagnostico: null,
        status: StatusOS.EM_DIAGNOSTICO,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const servico: any = { id: 'servico-1', precoBase: { value: 10 } };

      repository.findById.mockResolvedValue(os);
      servicoRepository.findById.mockResolvedValue(servico);
      repository.update.mockResolvedValue(os);
      await service.adicionarServico('os-123', 'servico-1', 1);

      await service.removerServico('os-123', 'servico-1');

      expect(os.itensServico).toHaveLength(0);
      expect(repository.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('findStatusByNumero (US-16)', () => {
    const makeOsWithItens = () =>
      OrdemDeServico.reconstitute({
        id: 'os-123',
        numero: 'OS-2026-1234567890-0001',
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        usuarioId: 'mecanico-1',
        descricaoInicial: 'barulho no motor',
        diagnostico: 'pastilhas desgastadas',
        status: StatusOS.EM_EXECUCAO,
        createdAt: new Date('2026-04-20T10:00:00Z'),
        updatedAt: new Date('2026-04-20T12:00:00Z'),
        itensServico: [
          new ItemServicoOS('servico-1', 2, 150),
          new ItemServicoOS('servico-2', 1, 80),
        ],
      });

    it('should return enriched status view with servico names', async () => {
      const os = makeOsWithItens();
      repository.findByNumero.mockResolvedValue(os);
      servicoRepository.findById.mockImplementation(async (id: string) => {
        if (id === 'servico-1') return { nome: 'Troca de oleo' } as any;
        if (id === 'servico-2') return { nome: 'Alinhamento' } as any;
        return null;
      });

      const view = await service.findStatusByNumero('OS-2026-1234567890-0001');

      expect(view.numero).toBe('OS-2026-1234567890-0001');
      expect(view.status).toBe(StatusOS.EM_EXECUCAO);
      expect(view.servicos).toHaveLength(2);
      expect(view.servicos[0]).toEqual({
        servicoId: 'servico-1',
        nome: 'Troca de oleo',
        quantidade: 2,
        precoUnitario: 150,
        subtotal: 300,
      });
      expect(view.valorTotalServicos).toBe(380);
      expect(view.valorTotal).toBe(380);
      expect(view.produtos).toEqual([]);
    });

    it('should use fallback name when servico removed from catalog', async () => {
      const os = makeOsWithItens();
      repository.findByNumero.mockResolvedValue(os);
      servicoRepository.findById.mockResolvedValue(null);

      const view = await service.findStatusByNumero('OS-2026-1234567890-0001');

      expect(view.servicos[0].nome).toBe('Servico removido do catalogo');
    });

    it('should throw OrdemDeServicoNotFoundError when numero nao existe', async () => {
      repository.findByNumero.mockResolvedValue(null);

      await expect(service.findStatusByNumero('OS-INEXISTENTE')).rejects.toThrow(
        OrdemDeServicoNotFoundError,
      );
    });
  });

  describe('findByCpfCnpj (US-16)', () => {
    const makeOs = () =>
      OrdemDeServico.reconstitute({
        id: 'os-1',
        numero: 'OS-2026-0000000001-0001',
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-1',
        usuarioId: null,
        descricaoInicial: 'teste',
        diagnostico: null,
        status: StatusOS.RECEBIDA,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    it('should return paginated history for authenticated cliente', async () => {
      const cliente: any = { id: 'cliente-123', email: 'joao@email.com' };
      clienteRepository.findByCpfCnpj.mockResolvedValue(cliente);
      repository.findAll.mockResolvedValue({
        data: [makeOs()],
        total: 1,
        page: 1,
        limit: 10,
      });

      const result = await service.findByCpfCnpj(
        '39053344705',
        'joao@email.com',
      );

      expect(clienteRepository.findByCpfCnpj).toHaveBeenCalledWith('39053344705');
      expect(repository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ clienteId: 'cliente-123' }),
      );
      expect(result.total).toBe(1);
      expect(result.data[0].numero).toBe('OS-2026-0000000001-0001');
    });

    it('should throw ClienteNotFoundError when CPF not in DB', async () => {
      clienteRepository.findByCpfCnpj.mockResolvedValue(null);

      await expect(
        service.findByCpfCnpj('11144477735', 'qualquer@x.com'),
      ).rejects.toThrow(ClienteNotFoundError);
    });

    it('should throw ClienteNotOwnedByUsuarioError when email does not match', async () => {
      const cliente: any = { id: 'cliente-123', email: 'outro@email.com' };
      clienteRepository.findByCpfCnpj.mockResolvedValue(cliente);

      await expect(
        service.findByCpfCnpj('39053344705', 'intruso@x.com'),
      ).rejects.toThrow(ClienteNotOwnedByUsuarioError);
    });

    it('should throw ClienteNotOwnedByUsuarioError when cliente has no email', async () => {
      const cliente: any = { id: 'cliente-123', email: null };
      clienteRepository.findByCpfCnpj.mockResolvedValue(cliente);

      await expect(
        service.findByCpfCnpj('39053344705', 'joao@email.com'),
      ).rejects.toThrow(ClienteNotOwnedByUsuarioError);
    });
  });
});
