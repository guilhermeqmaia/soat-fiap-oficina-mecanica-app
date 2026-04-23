import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaUsuarioRepository } from './prisma-usuario.repository';
import { Usuario } from '../../auth/domain/usuario.entity';
import { Role } from '../../auth/domain/role.enum';
import { startTestDatabase, stopTestDatabase } from '../../test/database.container';

jest.setTimeout(60000);

describe('PrismaUsuarioRepository — usuario module (integration)', () => {
  let repository: PrismaUsuarioRepository;
  let prisma: PrismaService;

  beforeAll(async () => {
    const databaseUrl = await startTestDatabase();
    process.env.DATABASE_URL = databaseUrl;

    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService, PrismaUsuarioRepository],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    repository = module.get<PrismaUsuarioRepository>(PrismaUsuarioRepository);

    await prisma.onModuleInit();
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await prisma.usuario.deleteMany();
  });

  const buildUsuario = (overrides: Partial<{ nome: string; email: string; role: Role }> = {}) =>
    Usuario.create({
      nome: overrides.nome ?? 'Fulano de Tal',
      email: overrides.email ?? 'fulano@oficina.com',
      senhaHash: '$2b$10$hashed',
      role: overrides.role ?? Role.ATENDENTE,
    });

  describe('create', () => {
    it('should persist and return a Usuario with generated id', async () => {
      const result = await repository.create(buildUsuario());

      expect(result.id).toBeDefined();
      expect(result.nome).toBe('Fulano de Tal');
      expect(result.email.value).toBe('fulano@oficina.com');
      expect(result.role).toBe(Role.ATENDENTE);
      expect(result.ativo).toBe(true);
    });
  });

  describe('findById', () => {
    it('should return Usuario when found', async () => {
      const created = await repository.create(buildUsuario());

      const found = await repository.findById(created.id!);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });

    it('should return null when not found', async () => {
      const found = await repository.findById('00000000-0000-0000-0000-000000000000');
      expect(found).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return Usuario when found', async () => {
      await repository.create(buildUsuario());

      const found = await repository.findByEmail('fulano@oficina.com');

      expect(found).not.toBeNull();
      expect(found!.email.value).toBe('fulano@oficina.com');
    });

    it('should return null when not found', async () => {
      const found = await repository.findByEmail('inexistente@oficina.com');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await repository.create(buildUsuario({ email: 'admin@of.com', role: Role.ADMIN }));
      await repository.create(buildUsuario({ email: 'mec1@of.com', role: Role.MECANICO }));
      await repository.create(buildUsuario({ email: 'mec2@of.com', role: Role.MECANICO }));
      await repository.create(buildUsuario({ email: 'cli@of.com', role: Role.CLIENTE, nome: 'Inativo' }));
    });

    it('should return paginated results without filters', async () => {
      const result = await repository.findAll({ page: 1, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(4);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
    });

    it('should return second page', async () => {
      const result = await repository.findAll({ page: 2, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.page).toBe(2);
    });

    it('should use defaults when page and limit are omitted', async () => {
      const result = await repository.findAll({});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(4);
    });

    it('should filter by role', async () => {
      const result = await repository.findAll({ page: 1, limit: 10, role: Role.MECANICO });

      expect(result.total).toBe(2);
      result.data.forEach((u) => expect(u.role).toBe(Role.MECANICO));
    });

    it('should filter by ativo = true', async () => {
      const inactive = await repository.create(
        buildUsuario({ email: 'inatv@of.com', role: Role.ATENDENTE }),
      );
      inactive.deactivate();
      await repository.update(inactive);

      const result = await repository.findAll({ page: 1, limit: 10, ativo: true });

      result.data.forEach((u) => expect(u.ativo).toBe(true));
    });

    it('should filter by ativo = false', async () => {
      const inactive = await repository.create(
        buildUsuario({ email: 'inatv2@of.com', role: Role.ATENDENTE }),
      );
      inactive.deactivate();
      await repository.update(inactive);

      const result = await repository.findAll({ page: 1, limit: 10, ativo: false });

      expect(result.total).toBeGreaterThanOrEqual(1);
      result.data.forEach((u) => expect(u.ativo).toBe(false));
    });
  });

  describe('update', () => {
    it('should persist updated fields', async () => {
      const created = await repository.create(buildUsuario());
      created.deactivate();

      const updated = await repository.update(created);

      expect(updated.ativo).toBe(false);

      const fromDb = await repository.findById(created.id!);
      expect(fromDb!.ativo).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete a Usuario', async () => {
      const created = await repository.create(buildUsuario());

      await repository.delete(created.id!);

      const found = await repository.findById(created.id!);
      expect(found).toBeNull();
    });
  });
});
