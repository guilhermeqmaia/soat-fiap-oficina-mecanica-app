import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsUUID } from 'class-validator';

export class AdicionarProdutoNaOSDto {
  @ApiProperty({
    description: 'ID do produto a adicionar a OS',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsUUID()
  produtoId: string;

  @ApiProperty({ description: 'Quantidade do produto a reservar', example: 2 })
  @IsInt()
  @IsPositive()
  quantidade: number;
}
