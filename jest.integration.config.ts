import type { Config } from 'jest';

const config: Config = {
  displayName: 'integration',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.(integration|e2e)\\.spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  collectCoverageFrom: [
    '**/infrastructure/prisma-*.repository.ts',
    '!**/generated/**',
  ],
  coverageDirectory: '../coverage/integration',
  coverageThreshold: {
    global: {
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
  },
  testEnvironment: 'node',
  testTimeout: 60000,
  // Cada e2e/integration spec sobe seu proprio PostgreSQL via testcontainers;
  // rodar em paralelo satura o daemon Docker e causa flakiness (404 em testes
  // que dependem de dados do beforeAll). Serializado e estavel em ~30s a mais.
  maxWorkers: 1,
};

export default config;
