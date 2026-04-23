import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../auth/domain/role.enum';
import { startTestDatabase, stopTestDatabase } from '../test/database.container';

jest.setTimeout(120000);

describe('Servico (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminToken: string;
  let atendenteToken: string;
  let mecanicoToken: string;
  let estoquistaToken: string;
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
    await prisma.servico.deleteMany();
    await prisma.usuario.deleteMany();

    const users = [
      { nome: 'Admin',      email: 'admin.svc@oficina.com',  senha: 'admin123', role: Role.ADMIN },
      { nome: 'Atendente',  email: 'atend.svc@oficina.com',  senha: 'atend123', role: Role.ATENDENTE },
      { nome: 'Mecanico',   email: 'mec.svc@oficina.com',    senha: 'mec123',   role: Role.MECANICO },
      { nome: 'Estoquista', email: 'estq.svc@oficina.com',   senha: 'estq123',  role: Role.ESTOQUISTA },
      { nome: 'Cliente',    email: 'cliente.svc@oficina.com',senha: 'cli123',   role: Role.CLIENTE },
    ];

    for (const u of users) {
      const senhaHash = await bcrypt.hash(u.senha, 10);
      await prisma.usuario.create({ data: { nome: u.nome, email: u.email, senhaHash, role: u.role, ativo: true } });
    }

    const login = async (email: string, senha: string) => {
      const res = await request(app.getHttpServer()).post('/auth/login').send({ email, senha });
      return res.body.accessToken as string;
    };

    adminToken     = await login('admin.svc@oficina.com',   'admin123');
    atendenteToken = await login('atend.svc@oficina.com',   'atend123');
    mecanicoToken  = await login('mec.svc@oficina.com',     'mec123');
    estoquistaToken = await login('estq.svc@oficina.com',   'estq123');
    clienteToken   = await login('cliente.svc@oficina.com', 'cli123');
  });

  afterAll(async () => {
    await app.close();
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await prisma.itemOrdemDeServicoServico.deleteMany();
    await prisma.servico.deleteMany();
  });

  // ─── POST /servicos ──────────────────────────────────────────────────────────

  describe('POST /servicos', () => {
    it('should create a servico', async () => {
      const res = await request(app.getHttpServer())
        .post('/servicos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Troca de oleo', precoBase: 150, tempoEstimadoHoras: 1 });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.nome).toBe('Troca de oleo');
      expect(res.body.precoBase).toBe(150);
      expect(res.body.tempoEstimadoHoras).toBe(1);
      expect(res.body.ativo).toBe(true);
    });

    it('should create a servico with optional descricao', async () => {
      const res = await request(app.getHttpServer())
        .post('/servicos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Alinhamento', descricao: 'Alinhamento de rodas', precoBase: 80, tempoEstimadoHoras: 0.5 });

      expect(res.status).toBe(201);
      expect(res.body.descricao).toBe('Alinhamento de rodas');
    });

    it('should return 409 for duplicate name', async () => {
      await request(app.getHttpServer())
        .post('/servicos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Balanceamento', precoBase: 60, tempoEstimadoHoras: 0.5 });

      const res = await request(app.getHttpServer())
        .post('/servicos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Balanceamento', precoBase: 70, tempoEstimadoHoras: 0.5 });

      expect(res.status).toBe(409);
    });

    it('should return 400 for non-positive precoBase', async () => {
      const res = await request(app.getHttpServer())
        .post('/servicos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Servico Gratis', precoBase: -10, tempoEstimadoHoras: 1 });

      expect(res.status).toBe(400);
    });

    it('should return 400 for non-positive tempoEstimadoHoras', async () => {
      const res = await request(app.getHttpServer())
        .post('/servicos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Servico Zero Tempo', precoBase: 100, tempoEstimadoHoras: 0 });

      expect(res.status).toBe(400);
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/servicos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Incompleto' });

      expect(res.status).toBe(400);
    });

    it('should return 401 without token', async () => {
      const res = await request(app.getHttpServer())
        .post('/servicos')
        .send({ nome: 'No Auth', precoBase: 100, tempoEstimadoHoras: 1 });

      expect(res.status).toBe(401);
    });

    it('should return 403 for non-ADMIN roles', async () => {
      for (const token of [atendenteToken, mecanicoToken, estoquistaToken, clienteToken]) {
        const res = await request(app.getHttpServer())
          .post('/servicos')
          .set('Authorization', `Bearer ${token}`)
          .send({ nome: 'Teste Role', precoBase: 100, tempoEstimadoHoras: 1 });
        expect(res.status).toBe(403);
      }
    });
  });

  // ─── GET /servicos ───────────────────────────────────────────────────────────

  describe('GET /servicos', () => {
    beforeEach(async () => {
      await prisma.servico.createMany({
        data: [
          { nome: 'Troca de filtro',   precoBase: 50,  tempoEstimadoHoras: 0.5, ativo: true },
          { nome: 'Revisao geral',     precoBase: 300, tempoEstimadoHoras: 4,   ativo: true },
          { nome: 'Troca de correia',  precoBase: 200, tempoEstimadoHoras: 2,   ativo: true },
        ],
      });
    });

    it('should return paginated list', async () => {
      const res = await request(app.getHttpServer())
        .get('/servicos')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(3);
    });

    it('should filter by nome', async () => {
      const res = await request(app.getHttpServer())
        .get('/servicos?nome=filtro')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((s: any) => expect(s.nome.toLowerCase()).toContain('filtro'));
    });

    it('should respect pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/servicos?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('should allow ATENDENTE, MECANICO, ESTOQUISTA', async () => {
      for (const token of [atendenteToken, mecanicoToken, estoquistaToken]) {
        const res = await request(app.getHttpServer())
          .get('/servicos')
          .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
      }
    });

    it('should deny CLIENTE role', async () => {
      const res = await request(app.getHttpServer())
        .get('/servicos')
        .set('Authorization', `Bearer ${clienteToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ─── GET /servicos/:id ───────────────────────────────────────────────────────

  describe('GET /servicos/:id', () => {
    it('should return servico by id', async () => {
      const created = await prisma.servico.create({
        data: { nome: 'Injecao eletronica', precoBase: 250, tempoEstimadoHoras: 2, ativo: true },
      });

      const res = await request(app.getHttpServer())
        .get(`/servicos/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.id);
      expect(res.body.nome).toBe('Injecao eletronica');
    });

    it('should return 404 for non-existent servico', async () => {
      const res = await request(app.getHttpServer())
        .get('/servicos/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── PATCH /servicos/:id ─────────────────────────────────────────────────────

  describe('PATCH /servicos/:id', () => {
    it('should update servico precoBase', async () => {
      const created = await prisma.servico.create({
        data: { nome: 'Servico Antigo', precoBase: 100, tempoEstimadoHoras: 1, ativo: true },
      });

      const res = await request(app.getHttpServer())
        .patch(`/servicos/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ precoBase: 150 });

      expect(res.status).toBe(200);
      expect(res.body.precoBase).toBe(150);
    });

    it('should return 409 when updating to an existing name', async () => {
      await prisma.servico.create({ data: { nome: 'Nome Existente', precoBase: 100, tempoEstimadoHoras: 1, ativo: true } });
      const target = await prisma.servico.create({ data: { nome: 'Para Renomear', precoBase: 200, tempoEstimadoHoras: 2, ativo: true } });

      const res = await request(app.getHttpServer())
        .patch(`/servicos/${target.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Nome Existente' });

      expect(res.status).toBe(409);
    });

    it('should return 404 for non-existent servico', async () => {
      const res = await request(app.getHttpServer())
        .patch('/servicos/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ precoBase: 200 });

      expect(res.status).toBe(404);
    });

    it('should return 403 for non-ADMIN roles', async () => {
      const created = await prisma.servico.create({
        data: { nome: 'Read Only', precoBase: 100, tempoEstimadoHoras: 1, ativo: true },
      });

      for (const token of [atendenteToken, mecanicoToken, estoquistaToken, clienteToken]) {
        const res = await request(app.getHttpServer())
          .patch(`/servicos/${created.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ precoBase: 999 });
        expect(res.status).toBe(403);
      }
    });
  });

  // ─── DELETE /servicos/:id ────────────────────────────────────────────────────

  describe('DELETE /servicos/:id', () => {
    it('should delete a servico and return 204', async () => {
      const created = await prisma.servico.create({
        data: { nome: 'Para Apagar', precoBase: 50, tempoEstimadoHoras: 0.5, ativo: true },
      });

      const res = await request(app.getHttpServer())
        .delete(`/servicos/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);

      const found = await prisma.servico.findUnique({ where: { id: created.id } });
      expect(found).toBeNull();
    });

    it('should return 404 for non-existent servico', async () => {
      const res = await request(app.getHttpServer())
        .delete('/servicos/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 403 for non-ADMIN roles', async () => {
      const created = await prisma.servico.create({
        data: { nome: 'Protegido', precoBase: 100, tempoEstimadoHoras: 1, ativo: true },
      });

      for (const token of [atendenteToken, mecanicoToken, estoquistaToken, clienteToken]) {
        const res = await request(app.getHttpServer())
          .delete(`/servicos/${created.id}`)
          .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
      }
    });
  });
});
