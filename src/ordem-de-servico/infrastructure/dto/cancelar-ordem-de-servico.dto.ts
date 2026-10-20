import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { MotivoCancelamento } from '../../domain/value-objects/motivo-cancelamento';

export class CancelarOrdemDeServicoDto {
  @ApiPropertyOptional({
    description: 'Motivo do cancelamento. Default OPERADOR (cancelamento manual pelo atendente).',
    enum: MotivoCancelamento,
    default: MotivoCancelamento.OPERADOR,
  })
  @IsOptional()
  @IsEnum(MotivoCancelamento)
  motivo?: MotivoCancelamento;
}
