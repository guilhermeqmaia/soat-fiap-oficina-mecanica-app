import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";

export class QueryOrdemDeServicoDto {
  @ApiProperty({
    description: "Numero da pagina (paginacao)",
    example: 1,
    required: false,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({
    description: "Quantidade de itens por pagina",
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
    description: "Filtrar por ID do cliente",
    example: "uuid-do-cliente",
    required: false,
  })
  @IsUUID()
  @IsOptional()
  clienteId?: string;

  @ApiProperty({
    description: "Filtrar por status da OS",
    example: "RECEBIDA",
    required: false,
    enum: [
      "RECEBIDA",
      "EM_DIAGNOSTICO",
      "AGUARDANDO_APROVACAO",
      "EM_EXECUCAO",
      "FINALIZADA",
      "ENTREGUE",
      "CANCELADA",
    ],
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({
    description: "Filtrar por número da OS",
    example: "OS-001",
    required: false,
  })
  @IsString()
  @IsOptional()
  numero?: string;

  @ApiProperty({
    description:
      "Incluir ordens de servico finalizadas e entregues na listagem",
    example: false,
    required: false,
    type: Boolean,
  })
  // `@Type(() => Boolean)` transformaria qualquer string não-vazia em `true`
  // (inclusive "false"). Coerção explícita: só "true"/true viram `true`.
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === "") return undefined;
    return value === true || value === "true";
  })
  @IsOptional()
  @IsBoolean()
  incluirEncerradas?: boolean;
}
