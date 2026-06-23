import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

enum RoleEnum {
  ADMIN = 'ADMIN',
  ATENDENTE = 'ATENDENTE',
  MECANICO = 'MECANICO',
  ESTOQUISTA = 'ESTOQUISTA',
  CLIENTE = 'CLIENTE',
}

export class QueryUsuarioDto {
  @ApiProperty({
    description: 'Número da página (paginação)',
    example: 1,
    required: false,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({
    description: 'Quantidade de itens por página',
    example: 10,
    required: false,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiProperty({
    description: 'Filtrar por role',
    enum: RoleEnum,
    example: 'MECANICO',
    required: false,
  })
  @IsEnum(RoleEnum)
  @IsOptional()
  role?: string;

  @ApiProperty({
    description: 'Filtrar por status ativo/inativo',
    example: true,
    required: false,
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  ativo?: boolean;
}
