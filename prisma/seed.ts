import 'dotenv/config';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

/**
 * Seed de DESENVOLVIMENTO. Popula dados de demonstracao e usuarios de teste
 * (credenciais conhecidas) a partir dos arquivos em `prisma/seeds/*.sql`.
 *
 * SEGURANCA: estes dados (incl. um ADMIN com senha conhecida) NUNCA devem
 * existir em producao. Por isso este script:
 *   - foi removido do pipeline de migrations (`prisma migrate deploy` nao semeia);
 *   - recusa rodar com NODE_ENV=production.
 * Em producao, crie o usuario administrador inicial por um canal seguro/manual.
 */
async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.error(
      'Recusando seed: NODE_ENV=production. Os seeds contem credenciais de teste e nao podem rodar em producao.',
    );
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL e obrigatorio para rodar o seed.');
    process.exit(1);
  }

  const seedsDir = join(__dirname, 'seeds');
  const files = readdirSync(seedsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const client = new Client({ connectionString });
  await client.connect();
  try {
    for (const file of files) {
      const sql = readFileSync(join(seedsDir, file), 'utf8');
      console.log(`Aplicando seed: ${file}`);
      await client.query(sql);
    }
    console.log(`Seed concluido (${files.length} arquivo(s)).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Falha ao rodar o seed:', err);
  process.exit(1);
});
