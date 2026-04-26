import { ApiProperty } from '@nestjs/swagger';
import { CanalNotificacao } from '../../domain/value-objects/canal-notificacao.vo';
import { StatusNotificacao } from '../../domain/value-objects/status-notificacao.vo';
import { TipoNotificacao } from '../../domain/value-objects/tipo-notificacao.vo';

export class NotificacaoResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  clienteId!: string;

  @ApiProperty({ nullable: true, type: String })
  ordemDeServicoId!: string | null;

  @ApiProperty({ enum: TipoNotificacao })
  tipo!: TipoNotificacao;

  @ApiProperty({ enum: CanalNotificacao })
  canal!: CanalNotificacao;

  @ApiProperty()
  destinatario!: string;

  @ApiProperty()
  assunto!: string;

  @ApiProperty()
  mensagem!: string;

  @ApiProperty({ enum: StatusNotificacao })
  status!: StatusNotificacao;

  @ApiProperty({ nullable: true, type: String })
  erro!: string | null;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  enviadaEm!: Date | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}
