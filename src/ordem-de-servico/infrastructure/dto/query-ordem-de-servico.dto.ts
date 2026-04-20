import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class QueryOrdemDeServicoDto {
  @ApiProperty({
    description: 'Numero da pagina (paginacao)',
    example: 1,
    required: false,
  })
  @Type(() => Number)
  @IsOptional()
  page?: number;

  @ApiProperty({
    description: 'Quantidade de itens por pagina',
    example: 10,
    required: false,
  })
  @Type(() => Number)
  @IsOptional()
  limit?: number;

  @ApiProperty({
    description: 'Filtrar por ID do cliente',
    example: 'uuid-do-cliente',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  clienteId?: string;

  @ApiProperty({
    description: 'Filtrar por status da OS',
    example: 'RECEBIDA',
    required: false,
    enum: [
      'RECEBIDA',
      'EM_DIAGNOSTICO',
      'AGUARDANDO_APROVACAO',
      'EM_EXECUCAO',
      'FINALIZADA',
      'ENTREGUE',
      'CANCELADA',
    ],
  })
  @IsString()
  @IsOptional()
  status?: string;
}
