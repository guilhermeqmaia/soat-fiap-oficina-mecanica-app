import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../auth/domain/role.enum';
import { startTestDatabase, stopTestDatabase } from '../test/database.container';

jest.setTimeout(120000);

describe('Veiculo (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminToken: string;
  let atendenteToken: string;
  let mecanicoToken: string;
  let clienteToken: string;

  let clienteId: string;
  let outroClienteId: string;

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
      { nome: 'Admin',     email: 'admin.vei@oficina.com',   senha: 'admin123', role: Role.ADMIN },
      { nome: 'Atendente', email: 'atend.vei@oficina.com',   senha: 'atend123', role: Role.ATENDENTE },
      { nome: 'Mecanico',  email: 'mec.vei@oficina.com',     senha: 'mec123',   role: Role.MECANICO },
      { nome: 'Cliente',   email: 'cliente.vei@oficina.com', senha: 'cli123',   role: Role.CLIENTE },
    ];

    for (const u of users) {
      const senhaHash = await bcrypt.hash(u.senha, 10);
      await prisma.usuario.create({ data: { nome: u.nome, email: u.email, senhaHash, role: u.role, ativo: true } });
    }

    const login = async (email: string, senha: string) => {
      const res = await request(app.getHttpServer()).post('/auth/login').send({ email, senha });
      return res.body.accessToken as string;
    };

    adminToken     = await login('admin.vei@oficina.com',   'admin123');
    atendenteToken = await login('atend.vei@oficina.com',   'atend123');
    mecanicoToken  = await login('mec.vei@oficina.com',     'mec123');
    clienteToken   = await login('cliente.vei@oficina.com', 'cli123');

    const c1 = await prisma.cliente.create({ data: { nome: 'Dono', cpfCnpj: '52998224725', telefone: '11111111111' } });
    clienteId = c1.id;

    const c2 = await prisma.cliente.create({ data: { nome: 'Outro', cpfCnpj: '83607697108', telefone: '22222222222' } });
    outroClienteId = c2.id;
  });

  afterAll(async () => {
    await app.close();
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await prisma.ordemDeServico.deleteMany();
    await prisma.veiculo.deleteMany();
  });

  // ─── POST /veiculos ──────────────────────────────────────────────────────────

  describe('POST /veiculos', () => {
    it('should create a veiculo with Mercosul plate', async () => {
      const res = await request(app.getHttpServer())
        .post('/veiculos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ placa: 'ABC1D23', marca: 'Toyota', modelo: 'Corolla', ano: 2024, clienteId });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.placa).toBe('ABC1D23');
      expect(res.body.marca).toBe('Toyota');
      expect(res.body.clienteId).toBe(clienteId);
      expect(res.body.ativo).toBe(true);
    });

    it('should create a veiculo with old plate format', async () => {
      const res = await request(app.getHttpServer())
        .post('/veiculos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ placa: 'ABC1234', marca: 'Ford', modelo: 'Ka', ano: 2010, clienteId });

      expect(res.status).toBe(201);
      expect(res.body.placa).toBe('ABC1234');
    });

    it('should allow ATENDENTE to create', async () => {
      const res = await request(app.getHttpServer())
        .post('/veiculos')
        .set('Authorization', `Bearer ${atendenteToken}`)
        .send({ placa: 'XYZ9W87', marca: 'Honda', modelo: 'Civic', ano: 2022, clienteId });

      expect(res.status).toBe(201);
    });

    it('should return 409 for duplicate plate', async () => {
      await request(app.getHttpServer())
        .post('/veiculos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ placa: 'DUP1A23', marca: 'Toyota', modelo: 'Hilux', ano: 2023, clienteId });

      const res = await request(app.getHttpServer())
        .post('/veiculos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ placa: 'DUP1A23', marca: 'Ford', modelo: 'Ranger', ano: 2023, clienteId: outroClienteId });

      expect(res.status).toBe(409);
    });

    it('should return 400 for invalid plate format', async () => {
      const res = await request(app.getHttpServer())
        .post('/veiculos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ placa: 'INVALID', marca: 'Toyota', modelo: 'Corolla', ano: 2024, clienteId });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent cliente', async () => {
      const res = await request(app.getHttpServer())
        .post('/veiculos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ placa: 'TST1A23', marca: 'Toyota', modelo: 'Corolla', ano: 2024, clienteId: '00000000-0000-0000-0000-000000000000' });

      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid ano', async () => {
      const res = await request(app.getHttpServer())
        .post('/veiculos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ placa: 'ANO1A23', marca: 'Ford', modelo: 'Ka', ano: 1800, clienteId });

      expect(res.status).toBe(400);
    });

    it('should return 401 without token', async () => {
      const res = await request(app.getHttpServer())
        .post('/veiculos')
        .send({ placa: 'ABC1D23', marca: 'Toyota', modelo: 'Corolla', ano: 2024, clienteId });

      expect(res.status).toBe(401);
    });

    it('should return 403 for MECANICO role', async () => {
      const res = await request(app.getHttpServer())
        .post('/veiculos')
        .set('Authorization', `Bearer ${mecanicoToken}`)
        .send({ placa: 'ABC1D23', marca: 'Toyota', modelo: 'Corolla', ano: 2024, clienteId });

      expect(res.status).toBe(403);
    });

    it('should return 403 for CLIENTE role', async () => {
      const res = await request(app.getHttpServer())
        .post('/veiculos')
        .set('Authorization', `Bearer ${clienteToken}`)
        .send({ placa: 'ABC1D23', marca: 'Toyota', modelo: 'Corolla', ano: 2024, clienteId });

      expect(res.status).toBe(403);
    });
  });

  // ─── GET /veiculos ───────────────────────────────────────────────────────────

  describe('GET /veiculos', () => {
    beforeEach(async () => {
      await prisma.veiculo.createMany({
        data: [
          { placa: 'AAA1A11', marca: 'Toyota',   modelo: 'Corolla', ano: 2020, clienteId, ativo: true },
          { placa: 'BBB2B22', marca: 'Honda',    modelo: 'Civic',   ano: 2021, clienteId, ativo: true },
          { placa: 'CCC3C33', marca: 'Ford',     modelo: 'Ka',      ano: 2019, clienteId: outroClienteId, ativo: true },
        ],
      });
    });

    it('should return paginated list', async () => {
      const res = await request(app.getHttpServer())
        .get('/veiculos')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(3);
    });

    it('should filter by marca', async () => {
      const res = await request(app.getHttpServer())
        .get('/veiculos?marca=Toyota')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((v: any) => expect(v.marca).toMatch(/Toyota/i));
    });

    it('should filter by placa', async () => {
      const res = await request(app.getHttpServer())
        .get('/veiculos?placa=AAA1A11')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].placa).toBe('AAA1A11');
    });

    it('should allow ATENDENTE and MECANICO', async () => {
      for (const token of [atendenteToken, mecanicoToken]) {
        const res = await request(app.getHttpServer())
          .get('/veiculos')
          .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
      }
    });

    it('should deny CLIENTE role', async () => {
      const res = await request(app.getHttpServer())
        .get('/veiculos')
        .set('Authorization', `Bearer ${clienteToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ─── GET /clientes/:clienteId/veiculos ───────────────────────────────────────

  describe('GET /clientes/:clienteId/veiculos', () => {
    beforeEach(async () => {
      await prisma.veiculo.createMany({
        data: [
          { placa: 'DON1A11', marca: 'Toyota', modelo: 'Yaris',   ano: 2022, clienteId, ativo: true },
          { placa: 'DON2B22', marca: 'Honda',  modelo: 'Fit',     ano: 2021, clienteId, ativo: true },
          { placa: 'OTR1C33', marca: 'Ford',   modelo: 'Ranger',  ano: 2020, clienteId: outroClienteId, ativo: true },
        ],
      });
    });

    it('should return veiculos for a specific cliente', async () => {
      const res = await request(app.getHttpServer())
        .get(`/clientes/${clienteId}/veiculos`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      res.body.forEach((v: any) => expect(v.clienteId).toBe(clienteId));
    });

    it('should return 404 for non-existent cliente', async () => {
      const res = await request(app.getHttpServer())
        .get('/clientes/00000000-0000-0000-0000-000000000000/veiculos')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should return empty array when cliente has no veiculos', async () => {
      const res = await request(app.getHttpServer())
        .get(`/clientes/${outroClienteId}/veiculos`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });

  // ─── GET /veiculos/:id ───────────────────────────────────────────────────────

  describe('GET /veiculos/:id', () => {
    it('should return veiculo by id', async () => {
      const created = await prisma.veiculo.create({
        data: { placa: 'GBY1A23', marca: 'Nissan', modelo: 'Kicks', ano: 2023, clienteId, ativo: true },
      });

      const res = await request(app.getHttpServer())
        .get(`/veiculos/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.id);
      expect(res.body.placa).toBe('GBY1A23');
    });

    it('should return 404 for non-existent veiculo', async () => {
      const res = await request(app.getHttpServer())
        .get('/veiculos/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── PATCH /veiculos/:id ─────────────────────────────────────────────────────

  describe('PATCH /veiculos/:id', () => {
    it('should update veiculo modelo and ano', async () => {
      const created = await prisma.veiculo.create({
        data: { placa: 'UPD1A23', marca: 'Toyota', modelo: 'Old', ano: 2019, clienteId, ativo: true },
      });

      const res = await request(app.getHttpServer())
        .patch(`/veiculos/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ modelo: 'New', ano: 2023 });

      expect(res.status).toBe(200);
      expect(res.body.modelo).toBe('New');
      expect(res.body.ano).toBe(2023);
    });

    it('should return 404 for non-existent veiculo', async () => {
      const res = await request(app.getHttpServer())
        .patch('/veiculos/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ modelo: 'Ghost' });

      expect(res.status).toBe(404);
    });

    it('should return 403 for MECANICO role', async () => {
      const created = await prisma.veiculo.create({
        data: { placa: 'MEK1A23', marca: 'VW', modelo: 'Gol', ano: 2018, clienteId, ativo: true },
      });

      const res = await request(app.getHttpServer())
        .patch(`/veiculos/${created.id}`)
        .set('Authorization', `Bearer ${mecanicoToken}`)
        .send({ modelo: 'Hacked' });

      expect(res.status).toBe(403);
    });
  });

  // ─── DELETE /veiculos/:id ────────────────────────────────────────────────────

  describe('DELETE /veiculos/:id', () => {
    it('should delete a veiculo and return 204', async () => {
      const created = await prisma.veiculo.create({
        data: { placa: 'DEL1A23', marca: 'Fiat', modelo: 'Uno', ano: 2015, clienteId, ativo: true },
      });

      const res = await request(app.getHttpServer())
        .delete(`/veiculos/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);

      const found = await prisma.veiculo.findUnique({ where: { id: created.id } });
      expect(found).toBeNull();
    });

    it('should return 404 for non-existent veiculo', async () => {
      const res = await request(app.getHttpServer())
        .delete('/veiculos/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 403 for non-ADMIN roles', async () => {
      const created = await prisma.veiculo.create({
        data: { placa: 'PRO1A23', marca: 'Renault', modelo: 'Kwid', ano: 2021, clienteId, ativo: true },
      });

      for (const token of [atendenteToken, mecanicoToken, clienteToken]) {
        const res = await request(app.getHttpServer())
          .delete(`/veiculos/${created.id}`)
          .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
      }
    });
  });
});
