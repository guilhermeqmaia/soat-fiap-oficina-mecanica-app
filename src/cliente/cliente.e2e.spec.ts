import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../auth/domain/role.enum';
import { startTestDatabase, stopTestDatabase } from '../test/database.container';

jest.setTimeout(120000);

describe('Cliente (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminToken: string;
  let atendenteToken: string;
  let mecanicoToken: string;
  let clienteToken: string;

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

    const users = [
      { nome: 'Admin',     email: 'admin.cli@oficina.com',     senha: 'admin123',  role: Role.ADMIN },
      { nome: 'Atendente', email: 'atend.cli@oficina.com',     senha: 'atend123',  role: Role.ATENDENTE },
      { nome: 'Mecanico',  email: 'mec.cli@oficina.com',       senha: 'mec123',    role: Role.MECANICO },
      { nome: 'Cliente',   email: 'cliente.cli@oficina.com',   senha: 'cli123',    role: Role.CLIENTE },
    ];

    for (const u of users) {
      const senhaHash = await bcrypt.hash(u.senha, 10);
      await prisma.usuario.create({ data: { nome: u.nome, email: u.email, senhaHash, role: u.role, ativo: true } });
    }

    const login = async (email: string, senha: string) => {
      const res = await request(app.getHttpServer()).post('/auth/login').send({ email, senha });
      return res.body.accessToken as string;
    };

    adminToken     = await login('admin.cli@oficina.com',   'admin123');
    atendenteToken = await login('atend.cli@oficina.com',   'atend123');
    mecanicoToken  = await login('mec.cli@oficina.com',     'mec123');
    clienteToken   = await login('cliente.cli@oficina.com', 'cli123');
  });

  afterAll(async () => {
    await app.close();
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await prisma.ordemDeServico.deleteMany();
    await prisma.veiculo.deleteMany();
    await prisma.cliente.deleteMany();
  });

  // ─── POST /clientes ──────────────────────────────────────────────────────────

  describe('POST /clientes', () => {
    it('should create a cliente with CPF', async () => {
      const res = await request(app.getHttpServer())
        .post('/clientes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Joao Silva', cpfCnpj: '529.982.247-25', telefone: '11999990000', email: 'joao@test.com' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.nome).toBe('Joao Silva');
      expect(res.body.cpfCnpj).toBe('52998224725');
      expect(res.body.telefone).toBe('11999990000');
      expect(res.body.email).toBe('joao@test.com');
    });

    it('should create a cliente with CNPJ', async () => {
      const res = await request(app.getHttpServer())
        .post('/clientes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Empresa LTDA', cpfCnpj: '11.222.333/0001-81', telefone: '1133334444' });

      expect(res.status).toBe(201);
      expect(res.body.cpfCnpj).toBe('11222333000181');
    });

    it('should allow ATENDENTE to create', async () => {
      const res = await request(app.getHttpServer())
        .post('/clientes')
        .set('Authorization', `Bearer ${atendenteToken}`)
        .send({ nome: 'Maria Santos', cpfCnpj: '836.076.971-08', telefone: '11988887777' });

      expect(res.status).toBe(201);
    });

    it('should return 409 for duplicate CPF/CNPJ', async () => {
      await request(app.getHttpServer())
        .post('/clientes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Cliente A', cpfCnpj: '529.982.247-25', telefone: '11111111111' });

      const res = await request(app.getHttpServer())
        .post('/clientes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Cliente B', cpfCnpj: '529.982.247-25', telefone: '22222222222' });

      expect(res.status).toBe(409);
    });

    it('should return 400 for invalid CPF', async () => {
      const res = await request(app.getHttpServer())
        .post('/clientes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Invalid', cpfCnpj: '111.111.111-11', telefone: '11999990000' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/clientes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Missing Fields' });

      expect(res.status).toBe(400);
    });

    it('should return 401 without token', async () => {
      const res = await request(app.getHttpServer())
        .post('/clientes')
        .send({ nome: 'No Auth', cpfCnpj: '529.982.247-25', telefone: '11999990000' });

      expect(res.status).toBe(401);
    });

    it('should return 403 for MECANICO role', async () => {
      const res = await request(app.getHttpServer())
        .post('/clientes')
        .set('Authorization', `Bearer ${mecanicoToken}`)
        .send({ nome: 'Test', cpfCnpj: '529.982.247-25', telefone: '11999990000' });

      expect(res.status).toBe(403);
    });

    it('should return 403 for CLIENTE role', async () => {
      const res = await request(app.getHttpServer())
        .post('/clientes')
        .set('Authorization', `Bearer ${clienteToken}`)
        .send({ nome: 'Test', cpfCnpj: '529.982.247-25', telefone: '11999990000' });

      expect(res.status).toBe(403);
    });
  });

  // ─── GET /clientes ───────────────────────────────────────────────────────────

  describe('GET /clientes', () => {
    beforeEach(async () => {
      await prisma.cliente.createMany({
        data: [
          { nome: 'Ana Lima',   cpfCnpj: '52998224725', telefone: '11111111111' },
          { nome: 'Bruno Cruz', cpfCnpj: '83607697108', telefone: '22222222222' },
          { nome: 'Carla Dias', cpfCnpj: '71428793860', telefone: '33333333333' },
        ],
      });
    });

    it('should return paginated list', async () => {
      const res = await request(app.getHttpServer())
        .get('/clientes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(3);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(10);
    });

    it('should respect page and limit params', async () => {
      const res = await request(app.getHttpServer())
        .get('/clientes?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.limit).toBe(2);
    });

    it('should filter by nome', async () => {
      const res = await request(app.getHttpServer())
        .get('/clientes?nome=Ana')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((c: any) => expect(c.nome).toMatch(/Ana/i));
    });

    it('should allow ATENDENTE and MECANICO', async () => {
      for (const token of [atendenteToken, mecanicoToken]) {
        const res = await request(app.getHttpServer())
          .get('/clientes')
          .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
      }
    });

    it('should deny CLIENTE role', async () => {
      const res = await request(app.getHttpServer())
        .get('/clientes')
        .set('Authorization', `Bearer ${clienteToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ─── GET /clientes/:id ───────────────────────────────────────────────────────

  describe('GET /clientes/:id', () => {
    it('should return cliente by id', async () => {
      const created = await prisma.cliente.create({
        data: { nome: 'Pedro Alves', cpfCnpj: '52998224725', telefone: '11999990000' },
      });

      const res = await request(app.getHttpServer())
        .get(`/clientes/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.id);
      expect(res.body.nome).toBe('Pedro Alves');
    });

    it('should return 404 for non-existent id', async () => {
      const res = await request(app.getHttpServer())
        .get('/clientes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app.getHttpServer())
        .get('/clientes/not-a-uuid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });
  });

  // ─── PATCH /clientes/:id ─────────────────────────────────────────────────────

  describe('PATCH /clientes/:id', () => {
    it('should update cliente nome and telefone', async () => {
      const created = await prisma.cliente.create({
        data: { nome: 'Antes', cpfCnpj: '52998224725', telefone: '11111111111' },
      });

      const res = await request(app.getHttpServer())
        .patch(`/clientes/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Depois', telefone: '22222222222' });

      expect(res.status).toBe(200);
      expect(res.body.nome).toBe('Depois');
      expect(res.body.telefone).toBe('22222222222');
    });

    it('should return 404 for non-existent cliente', async () => {
      const res = await request(app.getHttpServer())
        .patch('/clientes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Ghost' });

      expect(res.status).toBe(404);
    });

    it('should return 403 for MECANICO role', async () => {
      const created = await prisma.cliente.create({
        data: { nome: 'Test', cpfCnpj: '52998224725', telefone: '11111111111' },
      });

      const res = await request(app.getHttpServer())
        .patch(`/clientes/${created.id}`)
        .set('Authorization', `Bearer ${mecanicoToken}`)
        .send({ nome: 'Hacked' });

      expect(res.status).toBe(403);
    });
  });

  // ─── DELETE /clientes/:id ────────────────────────────────────────────────────

  describe('DELETE /clientes/:id', () => {
    it('should delete a cliente and return 204', async () => {
      const created = await prisma.cliente.create({
        data: { nome: 'Para Deletar', cpfCnpj: '52998224725', telefone: '11111111111' },
      });

      const res = await request(app.getHttpServer())
        .delete(`/clientes/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);

      const found = await prisma.cliente.findUnique({ where: { id: created.id } });
      expect(found).toBeNull();
    });

    it('should return 404 for non-existent cliente', async () => {
      const res = await request(app.getHttpServer())
        .delete('/clientes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 403 for non-ADMIN roles', async () => {
      const created = await prisma.cliente.create({
        data: { nome: 'Protected', cpfCnpj: '52998224725', telefone: '11111111111' },
      });

      for (const token of [atendenteToken, mecanicoToken, clienteToken]) {
        const res = await request(app.getHttpServer())
          .delete(`/clientes/${created.id}`)
          .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
      }
    });
  });
});
