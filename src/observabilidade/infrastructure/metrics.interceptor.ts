import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
import type { Request, Response } from 'express';
import { httpDuration } from '../metrics.registry';

/**
 * Mede a latencia de cada request HTTP (US-F3-10).
 *
 * Fecha a medicao no evento `finish` da RESPOSTA, e nao no `tap` do fluxo:
 * quando o handler lanca um erro de dominio, o status final so e definido
 * depois, pelo DomainExceptionFilter. Medir no `tap` rotularia um 404 de
 * dominio como 500 e inflaria os 5xx dos dashboards/alertas (US-F3-11).
 *
 * Usa o PADRAO da rota (`/clientes/:id`), nunca a URL concreta: rotular por
 * URL explodiria a cardinalidade da metrica (um label por id).
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request & { route?: { path?: string } }>();
    const res = http.getResponse<Response>();
    const fim = httpDuration.startTimer();

    res.once('finish', () => {
      fim({
        method: req.method,
        route: req.route?.path ?? 'desconhecida',
        status: String(res.statusCode),
      });
    });

    return next.handle();
  }
}
