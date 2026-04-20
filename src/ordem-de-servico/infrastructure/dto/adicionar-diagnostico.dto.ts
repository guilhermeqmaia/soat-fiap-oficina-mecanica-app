import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class AdicionarDiagnosticoDto {
  @ApiProperty({
    description: 'Texto do diagnostico registrado pelo mecanico',
    example: 'Pastilhas de freio dianteiras desgastadas. Disco de freio com riscos profundos.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(1000)
  diagnostico: string;
}
