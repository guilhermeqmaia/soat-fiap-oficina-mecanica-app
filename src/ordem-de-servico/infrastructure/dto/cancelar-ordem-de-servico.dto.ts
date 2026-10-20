import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { MotivoCancelamento } from '../../domain/value-objects/motivo-cancelamento';

/** Motivos que um atendente pode informar; os demais sao reservados a saga (compensacoes/timeouts). */
export const MOTIVOS_MANUAIS = [MotivoCancelamento.OPERADOR] as const;

export class CancelarOrdemDeServicoDto {
  @ApiPropertyOptional({
    description: 'Motivo do cancelamento manual. Default OPERADOR; os demais motivos sao atribuidos pela saga.',
    enum: MOTIVOS_MANUAIS,
    default: MotivoCancelamento.OPERADOR,
  })
  @IsOptional()
  @IsIn(MOTIVOS_MANUAIS)
  motivo?: MotivoCancelamento;
}
