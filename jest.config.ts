import type { Config } from 'jest';

const config: Config = {
  collectCoverage: false,
  projects: [
    {
      displayName: 'unit',
      moduleFileExtensions: ['js', 'json', 'ts'],
      rootDir: 'src',
      testRegex: '^(?!.*\\.(integration|e2e)\\.spec\\.ts$).*\\.spec\\.ts$',
      transform: { '^.+\\.ts$': 'ts-jest' },
      setupFiles: ['<rootDir>/test/jest-setup-env.ts'],
      testEnvironment: 'node',
    },
    {
      displayName: 'integration',
      moduleFileExtensions: ['js', 'json', 'ts'],
      rootDir: 'src',
      testRegex: '.*\\.(integration|e2e)\\.spec\\.ts$',
      transform: { '^.+\\.ts$': 'ts-jest' },
      setupFiles: ['<rootDir>/test/jest-setup-env.ts'],
      testEnvironment: 'node',
    },
  ],
};

export default config;
