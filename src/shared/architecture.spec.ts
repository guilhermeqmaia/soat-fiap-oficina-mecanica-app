import * as fs from 'fs';
import * as path from 'path';

/**
 * Teste de fronteiras (Clean Architecture). Varre o codigo-fonte e garante a
 * regra de dependencia: as dependencias so apontam para dentro.
 *
 * - domain: nao importa application nem infrastructure, nem framework/ORM.
 * - application: nao importa Prisma (ORM), infrastructure, bcrypt, nem nenhum
 *   pacote de framework `@nestjs/*` — exceto os da allowlist abaixo: `@nestjs/common`
 *   (DI: Injectable/Inject/Logger) e `@nestjs/event-emitter` (assinatura inbound
 *   via @OnEvent). Drivers concretos (JWT, bcrypt, config) devem ficar atras de
 *   portas. Excecoes HTTP do Nest tambem sao proibidas.
 */

const SRC = path.resolve(__dirname, '..');

function collect(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'generated' || entry.name === 'node_modules') continue;
      collect(full, acc);
    } else if (
      entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.spec.ts')
    ) {
      acc.push(full);
    }
  }
  return acc;
}

const ALL_FILES = collect(SRC);

function importsOf(file: string): string[] {
  const src = fs.readFileSync(file, 'utf8');
  const regex = /from\s+['"]([^'"]+)['"]/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(src)) !== null) out.push(m[1]);
  return out;
}

const NEST_HTTP_EXCEPTIONS =
  /(NotFound|BadRequest|Conflict|Forbidden|Unauthorized|Http|InternalServerError|UnprocessableEntity)Exception/;

/**
 * Pacotes `@nestjs/*` tolerados no anel de aplicacao. Qualquer outro framework
 * Nest (jwt, config, passport, ...) deve entrar via porta/adapter na infra.
 */
const ALLOWED_NEST_IN_APPLICATION = ['@nestjs/common', '@nestjs/event-emitter'];

function isDisallowedNestImport(imp: string): boolean {
  if (imp !== '@nestjs' && !imp.startsWith('@nestjs/')) return false;
  return !ALLOWED_NEST_IN_APPLICATION.some(
    (allowed) => imp === allowed || imp.startsWith(`${allowed}/`),
  );
}

describe('Clean Architecture dependency rule', () => {
  const domainFiles = ALL_FILES.filter((f) =>
    f.includes(`${path.sep}domain${path.sep}`),
  );
  const applicationFiles = ALL_FILES.filter((f) =>
    f.includes(`${path.sep}application${path.sep}`),
  );

  it('has domain and application files to check', () => {
    expect(domainFiles.length).toBeGreaterThan(0);
    expect(applicationFiles.length).toBeGreaterThan(0);
  });

  it('domain never imports application, infrastructure, Nest or the ORM', () => {
    const violations: string[] = [];
    for (const file of domainFiles) {
      for (const imp of importsOf(file)) {
        if (
          imp.includes('/application/') ||
          imp.includes('/infrastructure/') ||
          imp.startsWith('@nestjs') ||
          imp.includes('generated/prisma') ||
          imp.includes('@prisma')
        ) {
          violations.push(`${path.relative(SRC, file)} -> ${imp}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('application never imports the ORM, Swagger, HTTP exceptions or infrastructure', () => {
    const violations: string[] = [];
    for (const file of applicationFiles) {
      const src = fs.readFileSync(file, 'utf8');
      if (NEST_HTTP_EXCEPTIONS.test(src)) {
        violations.push(`${path.relative(SRC, file)} -> Nest HTTP exception`);
      }
      for (const imp of importsOf(file)) {
        if (
          imp.includes('/infrastructure/') ||
          imp.includes('generated/prisma') ||
          imp.includes('@prisma') ||
          imp === 'bcrypt' ||
          imp.startsWith('bcrypt/') ||
          isDisallowedNestImport(imp)
        ) {
          violations.push(`${path.relative(SRC, file)} -> ${imp}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
