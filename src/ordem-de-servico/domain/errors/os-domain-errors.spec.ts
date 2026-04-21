import { OsNotOwnedByClienteError } from './os-not-owned-by-cliente.error';
import { InvalidDescriptionError } from './invalid-description.error';

describe('OS Domain Errors', () => {
  describe('OsNotOwnedByClienteError', () => {
    it('should create error with correct message and name', () => {
      const error = new OsNotOwnedByClienteError('os-123');
      expect(error.message).toContain('os-123');
      expect(error.name).toBe('OsNotOwnedByClienteError');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('InvalidDescriptionError', () => {
    it('should create error with provided message', () => {
      const error = new InvalidDescriptionError('custom message');
      expect(error.message).toBe('custom message');
      expect(error.name).toBe('InvalidDescriptionError');
    });

    it('should use default message when no argument provided', () => {
      const error = new InvalidDescriptionError();
      expect(error.message).toBe('Descricao invalida');
    });
  });
});
