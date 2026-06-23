import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { TipoMovimentacaoEstoque } from '../../domain/value-objects/tipo-movimentacao-estoque.vo';

export class QueryMovimentacoesDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: TipoMovimentacaoEstoque })
  @IsOptional()
  @IsEnum(TipoMovimentacaoEstoque)
  tipo?: TipoMovimentacaoEstoque;
}
