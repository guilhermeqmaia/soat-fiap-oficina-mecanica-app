import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsPositive, IsUUID } from 'class-validator';

export class AdicionarProdutoDto {
  @ApiProperty({
    description: 'ID do produto no catalogo',
    example: 'uuid-do-produto',
  })
  @IsUUID()
  @IsNotEmpty()
  produtoId: string;

  @ApiProperty({
    description: 'Quantidade do produto a ser adicionada',
    example: 2,
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantidade: number;
}
