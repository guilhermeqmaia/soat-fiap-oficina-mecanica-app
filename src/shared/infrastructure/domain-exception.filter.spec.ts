import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { DomainError, DomainErrorKind } from '../domain/domain-error';
import { DomainExceptionFilter } from './domain-exception.filter';

class FakeError extends DomainError {
  readonly kind: DomainErrorKind;
  constructor(kind: DomainErrorKind, message = 'boom') {
    super(message);
    this.kind = kind;
  }
}

function mockHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('DomainExceptionFilter', () => {
  const filter = new DomainExceptionFilter();

  const cases: Array<[DomainErrorKind, number]> = [
    [DomainErrorKind.NOT_FOUND, HttpStatus.NOT_FOUND],
    [DomainErrorKind.CONFLICT, HttpStatus.CONFLICT],
    [DomainErrorKind.INVALID_INPUT, HttpStatus.BAD_REQUEST],
    [DomainErrorKind.FORBIDDEN, HttpStatus.FORBIDDEN],
    [DomainErrorKind.UNAUTHORIZED, HttpStatus.UNAUTHORIZED],
  ];

  it.each(cases)('maps %s -> HTTP %s', (kind, expectedStatus) => {
    const { host, status, json } = mockHost();
    filter.catch(new FakeError(kind, 'mensagem de dominio'), host);

    expect(status).toHaveBeenCalledWith(expectedStatus);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: expectedStatus,
        message: 'mensagem de dominio',
      }),
    );
  });

  it('falls back to 400 for an unknown kind', () => {
    const { host, status } = mockHost();
    filter.catch(new FakeError('WEIRD' as DomainErrorKind), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
  });
});
