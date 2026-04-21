import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsPositive, IsUUID } from 'class-validator';

export class AdicionarServicoDto {
  @ApiProperty({
    description: 'ID do servico no catalogo',
    example: 'uuid-do-servico',
  })
  @IsUUID()
  @IsNotEmpty()
  servicoId: string;

  @ApiProperty({
    description: 'Quantidade do servico a ser adicionada',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantidade: number;
}
