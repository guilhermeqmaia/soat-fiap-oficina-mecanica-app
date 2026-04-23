import type { Config } from 'jest';

const config: Config = {
  projects: [
    {
      displayName: 'unit',
      moduleFileExtensions: ['js', 'json', 'ts'],
      rootDir: 'src',
      testRegex: '^(?!.*\\.(integration|e2e)\\.spec\\.ts$).*\\.spec\\.ts$',
      transform: { '^.+\\.ts$': 'ts-jest' },
      collectCoverage: false,
      testEnvironment: 'node',
    },
    {
      displayName: 'integration',
      moduleFileExtensions: ['js', 'json', 'ts'],
      rootDir: 'src',
      testRegex: '.*\\.(integration|e2e)\\.spec\\.ts$',
      transform: { '^.+\\.ts$': 'ts-jest' },
      collectCoverage: false,
      testEnvironment: 'node',
    },
  ],
};

export default config;
