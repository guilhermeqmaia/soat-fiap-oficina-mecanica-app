import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../auth/domain/role.enum';
import { mintToken } from '../auth/testing/token-factory';
import { StatusOS } from './domain/value-objects/status-os.vo';
import {
  startTestDatabase,
  stopTestDatabase,
} from '../test/database.container';

jest.setTimeout(120000);

describe('Webhook Aprovacao (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let WEBHOOK_TOKEN: string;

  const tokens: Record<string, string> = {};

  let clienteId: string;
  let veiculoId: string;
  let servicoId: string;
  let mecanicoUserId: string;

  beforeAll(async () => {
    const databaseUrl = await startTestDatabase();
    process.env.DATABASE_URL = databaseUrl;
    // JWT_SECRET vem de src/test/jest-setup-env.ts — o mesmo valor que o
    // ConfigModule ja validou no import do AppModule e que o mintToken usa.
    process.env.WEBHOOK_APPROVAL_TOKEN ??= 'e2e-webhook-secret-token';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = moduleRef.get<PrismaService>(PrismaService);

    const configService = moduleRef.get<ConfigService>(ConfigService);
    WEBHOOK_TOKEN = configService.get<string>('WEBHOOK_APPROVAL_TOKEN')!;

    await prisma.itemOrdemDeServicoServico.deleteMany();
    await prisma.ordemDeServico.deleteMany();
    await prisma.veiculo.deleteMany();
    await prisma.cliente.deleteMany();
    await prisma.servico.deleteMany();
    await prisma.usuario.deleteMany();

    // O mecanico ainda precisa existir no banco: atribuir-mecanico valida o
    // usuarioId informado no body. Senha nunca e verificada (login removido).
    const mecanico = await prisma.usuario.create({
      data: {
        nome: 'Mecanico',
        email: 'mecanico.wh@oficina.com',
        senhaHash: 'nao-usado-nos-testes',
        role: Role.MECANICO,
        ativo: true,
      },
    });
    mecanicoUserId = mecanico.id;

    // Resource server (US-F3-03): tokens emitidos direto nos testes com o
    // contrato da Lambda de CPF (sem POST /auth/login).
    tokens.admin = mintToken({ sub: 'admin-wh', nome: 'Admin', role: Role.ADMIN });
    tokens.mecanico = mintToken({ sub: mecanicoUserId, nome: 'Mecanico', role: Role.MECANICO });

    const clienteRes = await request(app.getHttpServer())
      .post('/clientes')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({
        nome: 'Cliente Webhook',
        cpfCnpj: '529.982.247-25',
        telefone: '11999990000',
        email: 'cliente.wh@oficina.com',
      });
    expect(clienteRes.status).toBe(201);
    clienteId = clienteRes.body.id;

    const veiculoRes = await request(app.getHttpServer())
      .post('/veiculos')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({
        placa: 'WBH1K23',
        marca: 'Honda',
        modelo: 'Civic',
        ano: 2023,
        clienteId,
      });
    expect(veiculoRes.status).toBe(201);
    veiculoId = veiculoRes.body.id;

    const servicoRes = await request(app.getHttpServer())
      .post('/servicos')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({
        nome: 'Troca de oleo webhook test',
        precoBase: 150,
        tempoEstimadoHoras: 0.5,
      });
    expect(servicoRes.status).toBe(201);
    servicoId = servicoRes.body.id;
  });

  afterAll(async () => {
    await app.close();
    await stopTestDatabase();
  });

  // ─── Helper: create OS and progress to AGUARDANDO_APROVACAO ────────────

  const createOsAguardandoAprovacao = async (): Promise<string> => {
    const osRes = await request(app.getHttpServer())
      .post('/ordens-servico')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ clienteId, veiculoId, descricaoInicial: 'Teste webhook' });
    expect(osRes.status).toBe(201);
    const osId = osRes.body.id;

    await request(app.getHttpServer())
      .post(`/ordens-servico/${osId}/atribuir-mecanico`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ usuarioId: mecanicoUserId });

    await request(app.getHttpServer())
      .post(`/ordens-servico/${osId}/servicos`)
      .set('Authorization', `Bearer ${tokens.mecanico}`)
      .send({ servicoId, quantidade: 1 });

    await request(app.getHttpServer())
      .post(`/ordens-servico/${osId}/completar-diagnostico`)
      .set('Authorization', `Bearer ${tokens.mecanico}`)
      .send({ diagnostico: 'Diagnostico completo para teste webhook' });

    return osId;
  };

  // ─── Webhook approval OK ──────────────────────────────────────────────

  describe('POST /webhooks/ordens-servico/:id/aprovacao — aprovacao', () => {
    it('should approve budget and return status EM_EXECUCAO', async () => {
      const osId = await createOsAguardandoAprovacao();

      const res = await request(app.getHttpServer())
        .post(`/webhooks/ordens-servico/${osId}/aprovacao`)
        .set('X-Webhook-Token', WEBHOOK_TOKEN)
        .send({ aprovado: true });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(StatusOS.EM_EXECUCAO);
      expect(res.body.id).toBe(osId);
    });
  });

  // ─── Webhook rejection OK ─────────────────────────────────────────────

  describe('POST /webhooks/ordens-servico/:id/aprovacao — reprovacao', () => {
    it('should reject budget and return status CANCELADA', async () => {
      const osId = await createOsAguardandoAprovacao();

      const res = await request(app.getHttpServer())
        .post(`/webhooks/ordens-servico/${osId}/aprovacao`)
        .set('X-Webhook-Token', WEBHOOK_TOKEN)
        .send({ aprovado: false, motivo: 'Muito caro' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(StatusOS.CANCELADA);
      expect(res.body.id).toBe(osId);
    });
  });

  // ─── Invalid token ────────────────────────────────────────────────────

  describe('POST /webhooks/ordens-servico/:id/aprovacao — token invalido', () => {
    it('should return 401 when token is missing', async () => {
      const osId = await createOsAguardandoAprovacao();

      const res = await request(app.getHttpServer())
        .post(`/webhooks/ordens-servico/${osId}/aprovacao`)
        .send({ aprovado: true });

      expect(res.status).toBe(401);
    });

    it('should return 401 when token is wrong', async () => {
      const osId = await createOsAguardandoAprovacao();

      const res = await request(app.getHttpServer())
        .post(`/webhooks/ordens-servico/${osId}/aprovacao`)
        .set('X-Webhook-Token', 'wrong-token')
        .send({ aprovado: true });

      expect(res.status).toBe(401);
    });
  });

  // ─── OS in invalid status ─────────────────────────────────────────────

  describe('POST /webhooks/ordens-servico/:id/aprovacao — status invalido', () => {
    it('should return 400 when OS is not in AGUARDANDO_APROVACAO', async () => {
      const osRes = await request(app.getHttpServer())
        .post('/ordens-servico')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ clienteId, veiculoId, descricaoInicial: 'OS em RECEBIDA' });
      expect(osRes.status).toBe(201);

      const res = await request(app.getHttpServer())
        .post(`/webhooks/ordens-servico/${osRes.body.id}/aprovacao`)
        .set('X-Webhook-Token', WEBHOOK_TOKEN)
        .send({ aprovado: true });

      expect(res.status).toBe(400);
    });

    it('should return 404 when OS does not exist', async () => {
      const res = await request(app.getHttpServer())
        .post('/webhooks/ordens-servico/00000000-0000-0000-0000-000000000000/aprovacao')
        .set('X-Webhook-Token', WEBHOOK_TOKEN)
        .send({ aprovado: true });

      expect(res.status).toBe(404);
    });
  });

  // ─── Validation ───────────────────────────────────────────────────────

  describe('POST /webhooks/ordens-servico/:id/aprovacao — validacao', () => {
    it('should return 400 when body is missing aprovado field', async () => {
      const osId = await createOsAguardandoAprovacao();

      const res = await request(app.getHttpServer())
        .post(`/webhooks/ordens-servico/${osId}/aprovacao`)
        .set('X-Webhook-Token', WEBHOOK_TOKEN)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 400 when aprovado is not boolean', async () => {
      const osId = await createOsAguardandoAprovacao();

      const res = await request(app.getHttpServer())
        .post(`/webhooks/ordens-servico/${osId}/aprovacao`)
        .set('X-Webhook-Token', WEBHOOK_TOKEN)
        .send({ aprovado: 'sim' });

      expect(res.status).toBe(400);
    });
  });
});
