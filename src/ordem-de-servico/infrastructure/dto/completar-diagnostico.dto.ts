import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CompletarDiagnosticoDto {
  @ApiProperty({
    description: 'Diagnostico completo realizado pelo mecanico',
    example: 'Pastilhas de freio desgastadas. Compressor do ar-condicionado com vazamento.',
  })
  @IsString()
  @IsOptional()
  @MinLength(5)
  @MaxLength(1000)
  diagnostico: string;
}
