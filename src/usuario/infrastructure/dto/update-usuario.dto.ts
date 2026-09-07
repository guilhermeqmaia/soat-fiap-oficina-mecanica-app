import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';

enum RoleEnum {
  ADMIN = 'ADMIN',
  ATENDENTE = 'ATENDENTE',
  MECANICO = 'MECANICO',
  ESTOQUISTA = 'ESTOQUISTA',
  CLIENTE = 'CLIENTE',
}

export class UpdateUsuarioDto {
  @ApiProperty({
    description: 'CPF do usuário (11 dígitos) — chave do login de staff (Fase 3)',
    example: '529.982.247-25',
    required: false,
  })
  @IsOptional()
  @Matches(/^(\d{3}\.?\d{3}\.?\d{3}-?\d{2})$/, {
    message: 'cpf deve ter 11 dígitos (com ou sem máscara)',
  })
  cpf?: string;

  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'João Silva Atualizado',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MinLength(3)
  nome?: string;

  @ApiProperty({
    description: 'Email único do usuário',
    example: 'joao.novo@mecanica.com',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Papel do usuário no sistema',
    enum: RoleEnum,
    example: 'ATENDENTE',
    required: false,
  })
  @IsEnum(RoleEnum)
  @IsOptional()
  role?: string;

  @ApiProperty({
    description: 'Status ativo/inativo do usuário',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  ativo?: boolean;
}
