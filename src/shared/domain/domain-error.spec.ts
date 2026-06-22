import { DomainError, DomainErrorKind } from './domain-error';

class SampleError extends DomainError {
  readonly kind = DomainErrorKind.NOT_FOUND;
  constructor() {
    super('nao encontrado');
  }
}

describe('DomainError', () => {
  it('is an Error, exposes kind and a class-derived name', () => {
    const err = new SampleError();
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(DomainError);
    expect(err).toBeInstanceOf(SampleError);
    expect(err.kind).toBe(DomainErrorKind.NOT_FOUND);
    expect(err.name).toBe('SampleError');
    expect(err.message).toBe('nao encontrado');
  });
});
