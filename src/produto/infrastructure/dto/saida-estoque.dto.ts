import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class SaidaEstoqueDto {
  @ApiProperty({ description: 'Quantidade a baixar do estoque', example: 3 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantidade: number;

  @ApiProperty({
    description: 'Motivo da saida (perda, ajuste, etc.)',
    required: false,
    example: 'Ajuste de inventario',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}
