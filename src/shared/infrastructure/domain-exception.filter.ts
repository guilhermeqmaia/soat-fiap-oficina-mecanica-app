import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  ForbiddenException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DomainError, DomainErrorKind } from '../domain/domain-error';

/**
 * Mapeia cada categoria de erro de dominio para a `HttpException` equivalente.
 * Reaproveitar as excecoes do Nest garante corpo de resposta byte-a-byte
 * identico ao que os controllers produziam com try/catch manual — contratos
 * REST inalterados.
 */
const HTTP_EXCEPTION_BY_KIND: Record<
  DomainErrorKind,
  new (message: string) => HttpException
> = {
  [DomainErrorKind.NOT_FOUND]: NotFoundException,
  [DomainErrorKind.CONFLICT]: ConflictException,
  [DomainErrorKind.INVALID_INPUT]: BadRequestException,
  [DomainErrorKind.FORBIDDEN]: ForbiddenException,
  [DomainErrorKind.UNAUTHORIZED]: UnauthorizedException,
};

/**
 * Exception filter global que traduz `DomainError` (camada de dominio) em
 * respostas HTTP. Centraliza a traducao que antes vivia espalhada em blocos
 * try/catch nos controllers.
 */
@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const HttpExceptionCtor =
      HTTP_EXCEPTION_BY_KIND[exception.kind] ?? BadRequestException;
    const httpException = new HttpExceptionCtor(exception.message);

    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    response.status(httpException.getStatus()).json(httpException.getResponse());
  }
}
