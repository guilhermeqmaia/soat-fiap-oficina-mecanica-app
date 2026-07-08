import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateOsItemProdutoDto {
  @ApiProperty({
    description: 'ID da peca/produto no catalogo de estoque',
    example: 'uuid-do-produto',
  })
  @IsUUID()
  @IsNotEmpty()
  produtoId: string;

  @ApiProperty({ description: 'Quantidade da peca', example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  quantidade: number;
}

export class CreateOsItemServicoDto {
  @ApiProperty({
    description: 'ID do servico no catalogo',
    example: 'uuid-do-servico',
  })
  @IsUUID()
  @IsNotEmpty()
  servicoId: string;

  @ApiProperty({ description: 'Quantidade do servico', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  quantidade: number;

  @ApiPropertyOptional({
    description: 'Pecas associadas a este servico',
    type: [CreateOsItemProdutoDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateOsItemProdutoDto)
  produtos?: CreateOsItemProdutoDto[];
}

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

  @ApiPropertyOptional({
    description:
      'Servicos (e pecas) ja declarados na abertura da OS. Opcional — tambem ' +
      'podem ser adicionados depois, durante o diagnostico. As pecas informadas ' +
      'aqui ja reservam estoque.',
    type: [CreateOsItemServicoDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateOsItemServicoDto)
  servicos?: CreateOsItemServicoDto[];
}
