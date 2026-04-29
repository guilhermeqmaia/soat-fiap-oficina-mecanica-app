import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class EntradaEstoqueDto {
  @ApiProperty({ description: 'Quantidade a adicionar ao estoque', example: 10 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantidade: number;

  @ApiProperty({
    description: 'Motivo da movimentacao (opcional)',
    required: false,
    example: 'Compra fornecedor X',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}
