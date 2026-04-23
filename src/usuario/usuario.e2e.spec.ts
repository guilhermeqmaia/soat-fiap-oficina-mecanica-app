import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../auth/domain/role.enum';
import { startTestDatabase, stopTestDatabase } from '../test/database.container';

jest.setTimeout(120000);

describe('Usuario (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminToken: string;
  let atendenteToken: string;
  let mecanicoToken: string;

  let adminId: string;

  beforeAll(async () => {
    const databaseUrl = await startTestDatabase();
    process.env.DATABASE_URL = databaseUrl;
    process.env.JWT_SECRET = 'test-secret';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = moduleRef.get<PrismaService>(PrismaService);

    await prisma.itemOrdemDeServicoServico.deleteMany();
    await prisma.ordemDeServico.deleteMany();
    await prisma.veiculo.deleteMany();
    await prisma.cliente.deleteMany();
    await prisma.usuario.deleteMany();

    const adminHash = await bcrypt.hash('admin123', 10);
    const admin = await prisma.usuario.create({
      data: { nome: 'Admin', email: 'admin.usr@oficina.com', senhaHash: adminHash, role: Role.ADMIN, ativo: true },
    });
    adminId = admin.id;

    const atendenteHash = await bcrypt.hash('atend123', 10);
    await prisma.usuario.create({
      data: { nome: 'Atendente', email: 'atend.usr@oficina.com', senhaHash: atendenteHash, role: Role.ATENDENTE, ativo: true },
    });

    const mecanicoHash = await bcrypt.hash('mec123', 10);
    await prisma.usuario.create({
      data: { nome: 'Mecanico', email: 'mec.usr@oficina.com', senhaHash: mecanicoHash, role: Role.MECANICO, ativo: true },
    });

    const login = async (email: string, senha: string) => {
      const res = await request(app.getHttpServer()).post('/auth/login').send({ email, senha });
      return res.body.accessToken as string;
    };

    adminToken     = await login('admin.usr@oficina.com', 'admin123');
    atendenteToken = await login('atend.usr@oficina.com', 'atend123');
    mecanicoToken  = await login('mec.usr@oficina.com',   'mec123');
  });

  afterAll(async () => {
    await app.close();
    await stopTestDatabase();
  });

  // ─── POST /usuario ───────────────────────────────────────────────────────────

  describe('POST /usuario', () => {
    afterEach(async () => {
      await prisma.usuario.deleteMany({ where: { email: { contains: '@temp.com' } } });
    });

    it('should create a usuario', async () => {
      const res = await request(app.getHttpServer())
        .post('/usuario')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Novo Mecanico', email: 'novo@temp.com', senha: 'senha123', role: 'MECANICO' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.nome).toBe('Novo Mecanico');
      expect(res.body.email).toBe('novo@temp.com');
      expect(res.body.role).toBe('MECANICO');
      expect(res.body.ativo).toBe(true);
      expect(res.body.senhaHash).toBeUndefined();
    });

    it('should create usuarios for all valid roles', async () => {
      const roles = ['ADMIN', 'ATENDENTE', 'MECANICO', 'ESTOQUISTA', 'CLIENTE'];

      for (const role of roles) {
        const res = await request(app.getHttpServer())
          .post('/usuario')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ nome: `Role ${role}`, email: `role-${role.toLowerCase()}@temp.com`, senha: 'senha123', role });

        expect(res.status).toBe(201);
        expect(res.body.role).toBe(role);
      }
    });

    it('should return 409 for duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/usuario')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'First', email: 'dup@temp.com', senha: 'senha123', role: 'MECANICO' });

      const res = await request(app.getHttpServer())
        .post('/usuario')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Second', email: 'dup@temp.com', senha: 'senha123', role: 'ATENDENTE' });

      expect(res.status).toBe(409);
    });

    it('should return 400 for invalid email', async () => {
      const res = await request(app.getHttpServer())
        .post('/usuario')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Invalid Email', email: 'not-an-email', senha: 'senha123', role: 'MECANICO' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid role', async () => {
      const res = await request(app.getHttpServer())
        .post('/usuario')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Invalid Role', email: 'inv@temp.com', senha: 'senha123', role: 'SUPER_ADMIN' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for senha too short', async () => {
      const res = await request(app.getHttpServer())
        .post('/usuario')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Short Pass', email: 'short@temp.com', senha: '123', role: 'MECANICO' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for nome too short', async () => {
      const res = await request(app.getHttpServer())
        .post('/usuario')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'AB', email: 'short-nome@temp.com', senha: 'senha123', role: 'MECANICO' });

      expect(res.status).toBe(400);
    });

    it('should return 401 without token', async () => {
      const res = await request(app.getHttpServer())
        .post('/usuario')
        .send({ nome: 'No Auth', email: 'noauth@temp.com', senha: 'senha123', role: 'MECANICO' });

      expect(res.status).toBe(401);
    });

    it('should return 403 for non-ADMIN roles', async () => {
      for (const token of [atendenteToken, mecanicoToken]) {
        const res = await request(app.getHttpServer())
          .post('/usuario')
          .set('Authorization', `Bearer ${token}`)
          .send({ nome: 'Unauthorized', email: 'unauth@temp.com', senha: 'senha123', role: 'MECANICO' });
        expect(res.status).toBe(403);
      }
    });
  });

  // ─── GET /usuario ────────────────────────────────────────────────────────────

  describe('GET /usuario', () => {
    it('should return paginated list', async () => {
      const res = await request(app.getHttpServer())
        .get('/usuario')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(typeof res.body.total).toBe('number');
      expect(res.body.total).toBeGreaterThanOrEqual(3);
    });

    it('should return 401 without token', async () => {
      const res = await request(app.getHttpServer()).get('/usuario');
      expect(res.status).toBe(401);
    });

    it('should return 403 for non-ADMIN roles', async () => {
      for (const token of [atendenteToken, mecanicoToken]) {
        const res = await request(app.getHttpServer())
          .get('/usuario')
          .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
      }
    });
  });

  // ─── GET /usuario/:id ────────────────────────────────────────────────────────

  describe('GET /usuario/:id', () => {
    it('should return usuario by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/usuario/${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(adminId);
      expect(res.body.email).toBe('admin.usr@oficina.com');
    });

    it('should return 404 for non-existent id', async () => {
      const res = await request(app.getHttpServer())
        .get('/usuario/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 403 for non-ADMIN roles', async () => {
      for (const token of [atendenteToken, mecanicoToken]) {
        const res = await request(app.getHttpServer())
          .get(`/usuario/${adminId}`)
          .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
      }
    });
  });

  // ─── PUT /usuario/:id ────────────────────────────────────────────────────────

  describe('PUT /usuario/:id', () => {
    let targetId: string;

    beforeEach(async () => {
      const hash = await bcrypt.hash('senha123', 10);
      const user = await prisma.usuario.create({
        data: { nome: 'Para Atualizar', email: `update-${Date.now()}@oficina.com`, senhaHash: hash, role: Role.MECANICO, ativo: true },
      });
      targetId = user.id;
    });

    afterEach(async () => {
      await prisma.usuario.deleteMany({ where: { id: targetId } });
    });

    it('should update usuario nome', async () => {
      const res = await request(app.getHttpServer())
        .put(`/usuario/${targetId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Nome Novo', role: 'MECANICO' });

      expect(res.status).toBe(200);
      expect(res.body.nome).toBe('Nome Novo');
    });

    it('should update usuario role', async () => {
      const res = await request(app.getHttpServer())
        .put(`/usuario/${targetId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'ATENDENTE' });

      expect(res.status).toBe(200);
      expect(res.body.role).toBe('ATENDENTE');
    });

    it('should return 404 for non-existent usuario', async () => {
      const res = await request(app.getHttpServer())
        .put('/usuario/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Ghost' });

      expect(res.status).toBe(404);
    });

    it('should return 409 when changing to existing email', async () => {
      const hash = await bcrypt.hash('senha123', 10);
      const other = await prisma.usuario.create({
        data: { nome: 'Other', email: 'other-taken@oficina.com', senhaHash: hash, role: Role.MECANICO, ativo: true },
      });

      const res = await request(app.getHttpServer())
        .put(`/usuario/${targetId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'other-taken@oficina.com' });

      expect(res.status).toBe(409);

      await prisma.usuario.delete({ where: { id: other.id } });
    });

    it('should return 403 for non-ADMIN roles', async () => {
      for (const token of [atendenteToken, mecanicoToken]) {
        const res = await request(app.getHttpServer())
          .put(`/usuario/${targetId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ nome: 'Hacked' });
        expect(res.status).toBe(403);
      }
    });
  });

  // ─── DELETE /usuario/:id ─────────────────────────────────────────────────────

  describe('DELETE /usuario/:id', () => {
    it('should delete a usuario and return 204', async () => {
      const hash = await bcrypt.hash('senha123', 10);
      const user = await prisma.usuario.create({
        data: { nome: 'Para Deletar', email: 'delete-me@oficina.com', senhaHash: hash, role: Role.MECANICO, ativo: true },
      });

      const res = await request(app.getHttpServer())
        .delete(`/usuario/${user.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);

      const found = await prisma.usuario.findUnique({ where: { id: user.id } });
      expect(found).toBeNull();
    });

    it('should return 404 for non-existent usuario', async () => {
      const res = await request(app.getHttpServer())
        .delete('/usuario/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 403 for non-ADMIN roles', async () => {
      const hash = await bcrypt.hash('senha123', 10);
      const user = await prisma.usuario.create({
        data: { nome: 'Protegido', email: 'protected@oficina.com', senhaHash: hash, role: Role.MECANICO, ativo: true },
      });

      for (const token of [atendenteToken, mecanicoToken]) {
        const res = await request(app.getHttpServer())
          .delete(`/usuario/${user.id}`)
          .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
      }

      await prisma.usuario.delete({ where: { id: user.id } });
    });
  });
});
