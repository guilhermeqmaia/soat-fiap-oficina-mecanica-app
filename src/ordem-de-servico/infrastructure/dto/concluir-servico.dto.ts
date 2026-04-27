import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class ConcluirServicoDto {
  @ApiProperty({ example: 2.5, description: 'Horas trabalhadas no servico' })
  @IsNumber()
  @Min(0.1)
  horasTrabalhadas: number;
}
