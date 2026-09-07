import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../app.module';
import { Role } from './domain/role.enum';
import { Roles } from './infrastructure/decorators/roles.decorator';
import { Public } from './infrastructure/decorators/public.decorator';
import { RolesGuard } from './infrastructure/guards/roles.guard';
import { mintToken } from './testing/token-factory';
import { startTestDatabase, stopTestDatabase } from '../test/database.container';

jest.setTimeout(120000);

// O segredo vem do jest-setup-env.ts (setupFiles) — o snapshot do
// ConfigService e criado no IMPORT do AppModule, entao nao se pode
// sobrescrever JWT_SECRET aqui.
const ISSUER = 'oficina-auth-lambda';

// Rotas de teste protegidas por roles diferentes
@Controller('test')
class TestProtectedController {
  @Get('public')
  @Public()
  publicRoute() {
    return { message: 'public' };
  }

  @Get('authenticated')
  authenticatedRoute() {
    return { message: 'authenticated' };
  }

  @Get('admin-only')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  adminRoute() {
    return { message: 'admin' };
  }
}

/**
 * Resource server (US-F3-03): a aplicacao NAO emite tokens. Estes testes
 * exercitam a validacao do JWT emitido pela Lambda de CPF (assinatura, iss,
 * exp, claims) e a construcao do principal a partir das claims.
 */
describe('Auth (e2e — resource server US-F3-03)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const databaseUrl = await startTestDatabase();
    process.env.DATABASE_URL = databaseUrl;

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestProtectedController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await stopTestDatabase();
  });

  describe('emissao removida do monolito', () => {
    it('POST /auth/login nao existe mais (login e na Lambda via gateway)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'a@b.com', senha: 'x' });
      // Cai no catch-all protegido: 401 sem token (nunca 200 com token local)
      expect([401, 404]).toContain(res.status);
    });
  });

  describe('validacao do token da Lambda', () => {
    it('aceita token valido emitido com o segredo/issuer compartilhados', async () => {
      const token = mintToken({
        sub: 'usr-1',
        nome: 'Admin',
        cpf: '52998224725',
        role: Role.ADMIN,
      });
      const res = await request(app.getHttpServer())
        .get('/test/authenticated')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('401 sem token', async () => {
      const res = await request(app.getHttpServer()).get('/test/authenticated');
      expect(res.status).toBe(401);
    });

    it('401 para assinatura com segredo divergente', async () => {
      const token = mintToken({ sub: 'u1', role: Role.ADMIN }, { secret: 'outro-segredo' });
      const res = await request(app.getHttpServer())
        .get('/test/authenticated')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });

    it('401 para issuer que nao e a Lambda', async () => {
      const token = mintToken({ sub: 'u1', role: Role.ADMIN }, { issuer: 'monolito-antigo' });
      const res = await request(app.getHttpServer())
        .get('/test/authenticated')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });

    it('401 para token expirado', async () => {
      const token = jwt.sign({ role: Role.ADMIN }, process.env.JWT_SECRET!, {
        algorithm: 'HS256',
        subject: 'u1',
        issuer: ISSUER,
        expiresIn: -10,
      });
      const res = await request(app.getHttpServer())
        .get('/test/authenticated')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });

    it('401 para role desconhecida na claim', async () => {
      const token = mintToken({ sub: 'u1', role: 'SUPREMO' });
      const res = await request(app.getHttpServer())
        .get('/test/authenticated')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });

    it('rotas @Public() seguem acessiveis sem token', async () => {
      const res = await request(app.getHttpServer()).get('/test/public');
      expect(res.status).toBe(200);
    });
  });

  describe('autorizacao por role a partir das claims', () => {
    it('ADMIN acessa rota admin-only', async () => {
      const token = mintToken({ sub: 'u1', role: Role.ADMIN });
      const res = await request(app.getHttpServer())
        .get('/test/admin-only')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('CLIENTE recebe 403 em rota admin-only', async () => {
      const token = mintToken({ sub: 'cli-1', cpf: '52998224725', role: Role.CLIENTE });
      const res = await request(app.getHttpServer())
        .get('/test/admin-only')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /auth/me', () => {
    it('devolve a identidade das claims, sem consultar banco', async () => {
      const token = mintToken({
        sub: 'cli-42',
        nome: 'Ana Souza',
        cpf: '52998224725',
        role: Role.CLIENTE,
      });
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: 'cli-42',
        nome: 'Ana Souza',
        cpf: '52998224725',
        role: Role.CLIENTE,
      });
    });
  });
});
