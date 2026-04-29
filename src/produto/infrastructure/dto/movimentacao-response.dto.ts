import { ApiProperty } from '@nestjs/swagger';
import { TipoMovimentacaoEstoque } from '../../domain/value-objects/tipo-movimentacao-estoque.vo';

export class MovimentacaoEstoqueResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  produtoId!: string;

  @ApiProperty({ enum: TipoMovimentacaoEstoque })
  tipo!: TipoMovimentacaoEstoque;

  @ApiProperty()
  quantidade!: number;

  @ApiProperty()
  estoqueResultante!: number;

  @ApiProperty({ nullable: true, type: String })
  ordemDeServicoId!: string | null;

  @ApiProperty({ nullable: true, type: String })
  motivo!: string | null;

  @ApiProperty({ nullable: true, type: String })
  usuarioId!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}
