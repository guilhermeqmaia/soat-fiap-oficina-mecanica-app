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

  it('throws when optional webhook secrets use known placeholders', () => {
    expect(() =>
      validateEnv({
        JWT_SECRET: 'test-secret',
        WEBHOOK_APPROVAL_TOKEN: 'change-me-to-a-strong-webhook-approval-token',
      }),
    ).toThrow(/WEBHOOK_APPROVAL_TOKEN/);

    expect(() =>
      validateEnv({
        JWT_SECRET: 'test-secret',
        NOTIFICATION_WEBHOOK_SECRET:
          'change-me-to-a-strong-notification-webhook-secret',
      }),
    ).toThrow(/NOTIFICATION_WEBHOOK_SECRET/);
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
