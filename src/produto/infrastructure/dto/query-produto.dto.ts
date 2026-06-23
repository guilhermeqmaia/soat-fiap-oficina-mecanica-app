import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, IsString, Max } from 'class-validator';

export class QueryProdutoDto {
  @ApiPropertyOptional({ description: 'Numero da pagina', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Itens por pagina', example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filtrar por nome', example: 'filtro' })
  @IsOptional()
  @IsString()
  nome?: string;
}
