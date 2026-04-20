import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateOrdemDeServicoDto {
  @ApiProperty({
    description: 'ID do cliente proprietario do veiculo',
    example: 'uuid-do-cliente',
  })
  @IsUUID()
  @IsNotEmpty()
  clienteId: string;

  @ApiProperty({
    description: 'ID do veiculo a ser atendido',
    example: 'uuid-do-veiculo',
  })
  @IsUUID()
  @IsNotEmpty()
  veiculoId: string;

  @ApiProperty({
    description: 'Descricao inicial da OS (observacoes do atendente)',
    example: 'Cliente relata barulho ao frenar e ar quente',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(500)
  descricaoInicial: string;
}
