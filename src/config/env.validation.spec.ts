import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  it('throws when JWT_SECRET is missing', () => {
    expect(() => validateEnv({})).toThrow(/JWT_SECRET/);
  });

  it('throws when JWT_SECRET is a known placeholder', () => {
    expect(() =>
      validateEnv({ JWT_SECRET: 'change-me-to-a-strong-random-secret' }),
    ).toThrow(/placeholder/i);
  });

  it('rejects a short secret in production', () => {
    expect(() =>
      validateEnv({ JWT_SECRET: 'short-secret', NODE_ENV: 'production' }),
    ).toThrow(/32/);
  });

  it('accepts a short non-placeholder secret outside production (dev/test)', () => {
    expect(() => validateEnv({ JWT_SECRET: 'test-secret' })).not.toThrow();
  });

  it('accepts a strong secret in production', () => {
    expect(() =>
      validateEnv({ JWT_SECRET: 'a'.repeat(48), NODE_ENV: 'production' }),
    ).not.toThrow();
  });
});
