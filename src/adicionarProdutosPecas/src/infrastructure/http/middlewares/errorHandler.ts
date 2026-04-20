import { Request, Response, NextFunction } from 'express';

interface DomainErrorWithStatus extends Error {
  statusHttp?: number;
  detalhes?: unknown;
}

/**
 * Middleware: errorHandler
 * Converte erros de domínio em respostas HTTP padronizadas.
 * Deve ser registrado DEPOIS de todas as rotas no Express.
 */
export function errorHandler(
  err: DomainErrorWithStatus,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err.statusHttp) {
    const body: Record<string, unknown> = { erro: err.message };
    if (err.detalhes !== undefined) body['detalhes'] = err.detalhes;
    res.status(err.statusHttp).json(body);
    return;
  }

  console.error('[ERRO NÃO TRATADO]', err);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
}
