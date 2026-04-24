import type { Config } from 'jest';

const config: Config = {
  displayName: 'AdicionarProdutosPecas',
  moduleFileExtensions: ['js', 'json', 'ts'],
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          target: 'ES2021',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          skipLibCheck: true,
          strictNullChecks: false,
          noImplicitAny: false,
          types: ['jest', 'node'],
        },
      },
    ],
  },
  testEnvironment: 'node',
  testTimeout: 30000,
};

export default config;
