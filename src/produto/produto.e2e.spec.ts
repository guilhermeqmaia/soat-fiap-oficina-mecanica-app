import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../auth/domain/role.enum';
import { startTestDatabase, stopTestDatabase } from '../test/database.container';

jest.setTimeout(120000);

describe('Produto (e2e)', () => {
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
    await prisma.produto.deleteMany();
    await prisma.usuario.deleteMany();

    const users = [
      { nome: 'Admin',      email: 'admin.prd@oficina.com',  senha: 'admin123', role: Role.ADMIN },
      { nome: 'Atendente',  email: 'atend.prd@oficina.com',  senha: 'atend123', role: Role.ATENDENTE },
      { nome: 'Mecanico',   email: 'mec.prd@oficina.com',    senha: 'mec123',   role: Role.MECANICO },
      { nome: 'Estoquista', email: 'estq.prd@oficina.com',   senha: 'estq123',  role: Role.ESTOQUISTA },
      { nome: 'Cliente',    email: 'cliente.prd@oficina.com',senha: 'cli123',   role: Role.CLIENTE },
    ];

    for (const u of users) {
      const senhaHash = await bcrypt.hash(u.senha, 10);
      await prisma.usuario.create({ data: { nome: u.nome, email: u.email, senhaHash, role: u.role, ativo: true } });
    }

    const login = async (email: string, senha: string) => {
      const res = await request(app.getHttpServer()).post('/auth/login').send({ email, senha });
      return res.body.accessToken as string;
    };

    adminToken      = await login('admin.prd@oficina.com',   'admin123');
    atendenteToken  = await login('atend.prd@oficina.com',   'atend123');
    mecanicoToken   = await login('mec.prd@oficina.com',     'mec123');
    estoquistaToken = await login('estq.prd@oficina.com',    'estq123');
    clienteToken    = await login('cliente.prd@oficina.com', 'cli123');
  });

  afterAll(async () => {
    await app.close();
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await prisma.produto.deleteMany();
  });

  // ─── POST /produtos ──────────────────────────────────────────────────────────

  describe('POST /produtos', () => {
    it('should create a produto', async () => {
      const res = await request(app.getHttpServer())
        .post('/produtos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Filtro de oleo', precoUnitario: 29.9, quantidadeEstoque: 50, estoqueMinimo: 10 });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.nome).toBe('Filtro de oleo');
      expect(res.body.precoUnitario).toBe(29.9);
      expect(res.body.quantidadeEstoque).toBe(50);
      expect(res.body.estoqueMinimo).toBe(10);
      expect(res.body.ativo).toBe(true);
      expect(typeof res.body.alertaEstoqueBaixo).toBe('boolean');
    });

    it('should create with optional descricao', async () => {
      const res = await request(app.getHttpServer())
        .post('/produtos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Pastilha de freio', descricao: 'Para eixo dianteiro', precoUnitario: 89.9, quantidadeEstoque: 20, estoqueMinimo: 5 });

      expect(res.status).toBe(201);
      expect(res.body.descricao).toBe('Para eixo dianteiro');
    });

    it('should allow ESTOQUISTA to create', async () => {
      const res = await request(app.getHttpServer())
        .post('/produtos')
        .set('Authorization', `Bearer ${estoquistaToken}`)
        .send({ nome: 'Vela de ignicao', precoUnitario: 15, quantidadeEstoque: 100, estoqueMinimo: 20 });

      expect(res.status).toBe(201);
    });

    it('should return 409 for duplicate name', async () => {
      await request(app.getHttpServer())
        .post('/produtos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Oleo de motor', precoUnitario: 45, quantidadeEstoque: 30, estoqueMinimo: 5 });

      const res = await request(app.getHttpServer())
        .post('/produtos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Oleo de motor', precoUnitario: 50, quantidadeEstoque: 10, estoqueMinimo: 2 });

      expect(res.status).toBe(409);
    });

    it('should return 400 for non-positive precoUnitario', async () => {
      const res = await request(app.getHttpServer())
        .post('/produtos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Gratis', precoUnitario: 0, quantidadeEstoque: 10, estoqueMinimo: 2 });

      expect(res.status).toBe(400);
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/produtos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Incompleto' });

      expect(res.status).toBe(400);
    });

    it('should return 401 without token', async () => {
      const res = await request(app.getHttpServer())
        .post('/produtos')
        .send({ nome: 'No Auth', precoUnitario: 10, quantidadeEstoque: 5, estoqueMinimo: 1 });

      expect(res.status).toBe(401);
    });

    it('should return 403 for ATENDENTE, MECANICO, CLIENTE', async () => {
      for (const token of [atendenteToken, mecanicoToken, clienteToken]) {
        const res = await request(app.getHttpServer())
          .post('/produtos')
          .set('Authorization', `Bearer ${token}`)
          .send({ nome: 'Teste Role', precoUnitario: 10, quantidadeEstoque: 5, estoqueMinimo: 1 });
        expect(res.status).toBe(403);
      }
    });
  });

  // ─── GET /produtos ───────────────────────────────────────────────────────────

  describe('GET /produtos', () => {
    beforeEach(async () => {
      await prisma.produto.createMany({
        data: [
          { nome: 'Filtro de ar',    precoUnitario: 25,  quantidadeEstoque: 30, quantidadeReservada: 0, estoqueMinimo: 5,  ativo: true },
          { nome: 'Correia dentada', precoUnitario: 120, quantidadeEstoque: 10, quantidadeReservada: 0, estoqueMinimo: 3,  ativo: true },
          { nome: 'Amortecedor',     precoUnitario: 350, quantidadeEstoque: 5,  quantidadeReservada: 0, estoqueMinimo: 2,  ativo: true },
        ],
      });
    });

    it('should return paginated list', async () => {
      const res = await request(app.getHttpServer())
        .get('/produtos')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(3);
    });

    it('should filter by nome', async () => {
      const res = await request(app.getHttpServer())
        .get('/produtos?nome=Filtro')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((p: any) => expect(p.nome.toLowerCase()).toContain('filtro'));
    });

    it('should respect pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/produtos?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('should allow ATENDENTE, MECANICO, ESTOQUISTA', async () => {
      for (const token of [atendenteToken, mecanicoToken, estoquistaToken]) {
        const res = await request(app.getHttpServer())
          .get('/produtos')
          .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
      }
    });

    it('should deny CLIENTE role', async () => {
      const res = await request(app.getHttpServer())
        .get('/produtos')
        .set('Authorization', `Bearer ${clienteToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ─── GET /produtos/:id ───────────────────────────────────────────────────────

  describe('GET /produtos/:id', () => {
    it('should return produto by id', async () => {
      const created = await prisma.produto.create({
        data: { nome: 'Rolamento', precoUnitario: 45, quantidadeEstoque: 20, quantidadeReservada: 0, estoqueMinimo: 5, ativo: true },
      });

      const res = await request(app.getHttpServer())
        .get(`/produtos/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.id);
      expect(res.body.nome).toBe('Rolamento');
    });

    it('should return 404 for non-existent produto', async () => {
      const res = await request(app.getHttpServer())
        .get('/produtos/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── PATCH /produtos/:id ─────────────────────────────────────────────────────

  describe('PATCH /produtos/:id', () => {
    it('should update produto precoUnitario', async () => {
      const created = await prisma.produto.create({
        data: { nome: 'Para Atualizar', precoUnitario: 10, quantidadeEstoque: 5, quantidadeReservada: 0, estoqueMinimo: 1, ativo: true },
      });

      const res = await request(app.getHttpServer())
        .patch(`/produtos/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ precoUnitario: 20 });

      expect(res.status).toBe(200);
      expect(res.body.precoUnitario).toBe(20);
    });

    it('should return 409 when renaming to an existing name', async () => {
      await prisma.produto.create({ data: { nome: 'Nome Ja Existe', precoUnitario: 10, quantidadeEstoque: 5, quantidadeReservada: 0, estoqueMinimo: 1, ativo: true } });
      const target = await prisma.produto.create({ data: { nome: 'Para Renomear', precoUnitario: 20, quantidadeEstoque: 10, quantidadeReservada: 0, estoqueMinimo: 2, ativo: true } });

      const res = await request(app.getHttpServer())
        .patch(`/produtos/${target.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Nome Ja Existe' });

      expect(res.status).toBe(409);
    });

    it('should return 404 for non-existent produto', async () => {
      const res = await request(app.getHttpServer())
        .patch('/produtos/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ precoUnitario: 99 });

      expect(res.status).toBe(404);
    });

    it('should return 403 for ATENDENTE, MECANICO, CLIENTE', async () => {
      const created = await prisma.produto.create({
        data: { nome: 'Protegido', precoUnitario: 10, quantidadeEstoque: 5, quantidadeReservada: 0, estoqueMinimo: 1, ativo: true },
      });

      for (const token of [atendenteToken, mecanicoToken, clienteToken]) {
        const res = await request(app.getHttpServer())
          .patch(`/produtos/${created.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ precoUnitario: 999 });
        expect(res.status).toBe(403);
      }
    });
  });

  // ─── POST /produtos/:id/estoque ──────────────────────────────────────────────

  describe('POST /produtos/:id/estoque', () => {
    it('should add stock and update quantidadeEstoque', async () => {
      const created = await prisma.produto.create({
        data: { nome: 'Produto Estoque', precoUnitario: 10, quantidadeEstoque: 5, quantidadeReservada: 0, estoqueMinimo: 1, ativo: true },
      });

      const res = await request(app.getHttpServer())
        .post(`/produtos/${created.id}/estoque`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantidade: 10 });

      expect(res.status).toBe(201);
      expect(res.body.quantidadeEstoque).toBe(15);
    });

    it('should allow ESTOQUISTA to add stock', async () => {
      const created = await prisma.produto.create({
        data: { nome: 'Estoque Estoquista', precoUnitario: 10, quantidadeEstoque: 0, quantidadeReservada: 0, estoqueMinimo: 1, ativo: true },
      });

      const res = await request(app.getHttpServer())
        .post(`/produtos/${created.id}/estoque`)
        .set('Authorization', `Bearer ${estoquistaToken}`)
        .send({ quantidade: 5 });

      expect(res.status).toBe(201);
      expect(res.body.quantidadeEstoque).toBe(5);
    });

    it('should return 400 for zero quantity', async () => {
      const created = await prisma.produto.create({
        data: { nome: 'Estoque Zero', precoUnitario: 10, quantidadeEstoque: 10, quantidadeReservada: 0, estoqueMinimo: 1, ativo: true },
      });

      const res = await request(app.getHttpServer())
        .post(`/produtos/${created.id}/estoque`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantidade: 0 });

      expect(res.status).toBe(400);
    });

    it('should return 403 for ATENDENTE and CLIENTE', async () => {
      const created = await prisma.produto.create({
        data: { nome: 'No Add Stock', precoUnitario: 10, quantidadeEstoque: 10, quantidadeReservada: 0, estoqueMinimo: 1, ativo: true },
      });

      for (const token of [atendenteToken, clienteToken]) {
        const res = await request(app.getHttpServer())
          .post(`/produtos/${created.id}/estoque`)
          .set('Authorization', `Bearer ${token}`)
          .send({ quantidade: 5 });
        expect(res.status).toBe(403);
      }
    });
  });

  // ─── POST /produtos/:id/reservar ─────────────────────────────────────────────

  describe('POST /produtos/:id/reservar', () => {
    it('should reserve stock and update quantidadeReservada', async () => {
      const created = await prisma.produto.create({
        data: { nome: 'Para Reservar', precoUnitario: 20, quantidadeEstoque: 10, quantidadeReservada: 0, estoqueMinimo: 1, ativo: true },
      });

      const res = await request(app.getHttpServer())
        .post(`/produtos/${created.id}/reservar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantidade: 3 });

      expect(res.status).toBe(201);
      expect(res.body.quantidadeReservada).toBe(3);
      expect(res.body.quantidadeDisponivel).toBe(7);
    });

    it('should return 409 when reserving more than available', async () => {
      const created = await prisma.produto.create({
        data: { nome: 'Estoque Insuficiente', precoUnitario: 20, quantidadeEstoque: 2, quantidadeReservada: 0, estoqueMinimo: 1, ativo: true },
      });

      const res = await request(app.getHttpServer())
        .post(`/produtos/${created.id}/reservar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantidade: 5 });

      expect(res.status).toBe(409);
    });
  });

  // ─── POST /produtos/:id/liberar ──────────────────────────────────────────────

  describe('POST /produtos/:id/liberar', () => {
    it('should release reserved stock', async () => {
      const created = await prisma.produto.create({
        data: { nome: 'Para Liberar', precoUnitario: 20, quantidadeEstoque: 10, quantidadeReservada: 5, estoqueMinimo: 1, ativo: true },
      });

      const res = await request(app.getHttpServer())
        .post(`/produtos/${created.id}/liberar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantidade: 3 });

      expect(res.status).toBe(201);
      expect(res.body.quantidadeReservada).toBe(2);
      expect(res.body.quantidadeDisponivel).toBe(8);
    });
  });

  // ─── alertaEstoqueBaixo flag ─────────────────────────────────────────────────

  describe('alertaEstoqueBaixo', () => {
    it('should return alertaEstoqueBaixo=true when stock <= estoqueMinimo', async () => {
      const created = await prisma.produto.create({
        data: { nome: 'Estoque Baixo', precoUnitario: 10, quantidadeEstoque: 3, quantidadeReservada: 0, estoqueMinimo: 5, ativo: true },
      });

      const res = await request(app.getHttpServer())
        .get(`/produtos/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.alertaEstoqueBaixo).toBe(true);
    });

    it('should return alertaEstoqueBaixo=false when stock > estoqueMinimo', async () => {
      const created = await prisma.produto.create({
        data: { nome: 'Estoque OK', precoUnitario: 10, quantidadeEstoque: 20, quantidadeReservada: 0, estoqueMinimo: 5, ativo: true },
      });

      const res = await request(app.getHttpServer())
        .get(`/produtos/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.alertaEstoqueBaixo).toBe(false);
    });
  });

  // ─── DELETE /produtos/:id ────────────────────────────────────────────────────

  describe('DELETE /produtos/:id', () => {
    it('should delete a produto and return 204', async () => {
      const created = await prisma.produto.create({
        data: { nome: 'Para Deletar', precoUnitario: 10, quantidadeEstoque: 5, quantidadeReservada: 0, estoqueMinimo: 1, ativo: true },
      });

      const res = await request(app.getHttpServer())
        .delete(`/produtos/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);

      const found = await prisma.produto.findUnique({ where: { id: created.id } });
      expect(found).toBeNull();
    });

    it('should return 404 for non-existent produto', async () => {
      const res = await request(app.getHttpServer())
        .delete('/produtos/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 403 for non-ADMIN roles', async () => {
      const created = await prisma.produto.create({
        data: { nome: 'Protegido Delete', precoUnitario: 10, quantidadeEstoque: 5, quantidadeReservada: 0, estoqueMinimo: 1, ativo: true },
      });

      for (const token of [atendenteToken, mecanicoToken, estoquistaToken, clienteToken]) {
        const res = await request(app.getHttpServer())
          .delete(`/produtos/${created.id}`)
          .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
      }
    });
  });
});
