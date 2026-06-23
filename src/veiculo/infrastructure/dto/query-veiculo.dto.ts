import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsPositive, IsString, Max } from "class-validator";

export class QueryVeiculoDto {
  @ApiPropertyOptional({
    description: "Numero da pagina",
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Itens por pagina",
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: "Filtrar por marca", example: "Toyota" })
  @IsOptional()
  @IsString()
  marca?: string;

  @ApiPropertyOptional({
    description: "Filtrar por placa (ex: ABC-1234 ou ABC1234)",
    example: "ABC-1234",
  })
  @IsOptional()
  @IsString()
  placa?: string;
}
