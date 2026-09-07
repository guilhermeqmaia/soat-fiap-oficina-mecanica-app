import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

enum RoleEnum {
  ADMIN = 'ADMIN',
  ATENDENTE = 'ATENDENTE',
  MECANICO = 'MECANICO',
  ESTOQUISTA = 'ESTOQUISTA',
  CLIENTE = 'CLIENTE',
}

export class CreateUsuarioDto {
  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'João da Silva',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  nome: string;

  @ApiProperty({
    description: 'Email único do usuário',
    example: 'joao@mecanica.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description:
      'CPF do usuário (11 dígitos, com ou sem máscara) — chave do login de staff na Lambda de autenticação (Fase 3)',
    example: '529.982.247-25',
    required: false,
  })
  @IsOptional()
  @Matches(/^(\d{3}\.?\d{3}\.?\d{3}-?\d{2})$/, {
    message: 'cpf deve ter 11 dígitos (com ou sem máscara)',
  })
  cpf?: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'senha123',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  senha: string;

  @ApiProperty({
    description: 'Papel do usuário no sistema',
    enum: RoleEnum,
    example: 'MECANICO',
  })
  @IsEnum(RoleEnum)
  @IsNotEmpty()
  role: string;
}
