import { Inject, Injectable, Logger } from '@nestjs/common';
import { OrdemDeServico } from '../../domain/ordem-de-servico.entity';
import { OrdemDeServicoNotFoundError } from '../../domain/errors/ordem-de-servico-not-found.error';
import { InvalidStatusTransitionError } from '../../domain/errors/invalid-status-transition.error';
import { ORDEM_DE_SERVICO_GATEWAY, OrdemDeServicoGateway } from '../../application/gateways/ordem-de-servico.gateway';
import {
  RegistrarCancelamentoUseCase,
  RegistrarDiagnosticoUseCase,
  RegistrarEnfileiramentoUseCase,
  RegistrarExecucaoFinalizadaUseCase,
  RegistrarExecucaoIniciadaUseCase,
  RegistrarOrcamentoAprovadoUseCase,
  RegistrarOrcamentoGeradoUseCase,
} from '../../application/use-cases/transicoes';
import { EventoSaga, Prazos, PRAZOS_DEFAULT, SagaOS, TransicaoOS } from '../domain/saga-os.entity';
import { SAGA_REPOSITORY, SagaRepository } from '../domain/saga.repository';
import { sagaPassoDuracao, sagaPassos } from '../../../observabilidade/metrics.registry';

/** Prazos configuraveis por ambiente (demo usa minutos; producao dias/horas). */
export function prazosDoAmbiente(env: NodeJS.ProcessEnv = process.env): Prazos {
  const dias = Number(env.SAGA_TIMEOUT_APROVACAO_DIAS ?? 3);
  const horas = Number(env.SAGA_TIMEOUT_PAGAMENTO_HORAS ?? 24);
  return {
    aprovacaoMs: env.SAGA_TIMEOUT_APROVACAO_MS ? Number(env.SAGA_TIMEOUT_APROVACAO_MS) : dias * 24 * 60 * 60 * 1000,
    pagamentoMs: env.SAGA_TIMEOUT_PAGAMENTO_MS ? Number(env.SAGA_TIMEOUT_PAGAMENTO_MS) : horas * 60 * 60 * 1000,
  };
}

/**
 * Orquestrador da saga (RFC-0005): liga a maquina de estados pura (SagaOS) a
 * persistencia, as transicoes da OS e ao outbox de comandos.
 *
 * Ordem por evento: carrega a saga -> aplica (decide) -> transiciona a OS
 * (use cases idempotentes, transacao propria) -> salva saga + comandos
 * (transacao propria). Se a segunda gravacao falhar, a reentrega refaz tudo:
 * a transicao da OS vira no-op e a saga reaplica — por isso cada passo e
 * idempotente e a saga e a unica fonte de "o que fazer agora".
 */
@Injectable()
export class OrquestradorSagaService {
  private readonly logger = new Logger(OrquestradorSagaService.name);

  constructor(
    @Inject(SAGA_REPOSITORY) private readonly sagas: SagaRepository,
    @Inject(ORDEM_DE_SERVICO_GATEWAY) private readonly ordens: OrdemDeServicoGateway,
    private readonly enfileiramento: RegistrarEnfileiramentoUseCase,
    private readonly diagnostico: RegistrarDiagnosticoUseCase,
    private readonly orcamentoGerado: RegistrarOrcamentoGeradoUseCase,
    private readonly orcamentoAprovado: RegistrarOrcamentoAprovadoUseCase,
    private readonly execucaoIniciada: RegistrarExecucaoIniciadaUseCase,
    private readonly execucaoFinalizada: RegistrarExecucaoFinalizadaUseCase,
    private readonly cancelamento: RegistrarCancelamentoUseCase,
  ) {}

  /** Abertura da OS: cria a saga e envia `execucao.enfileirar` (outbox). */
  async iniciar(ordem: OrdemDeServico, resumo: { descricaoProblema: string }): Promise<SagaOS> {
    const existente = await this.sagas.findByNumero(ordem.numero);
    if (existente) return existente;
    const saga = SagaOS.iniciar({
      numero: ordem.numero,
      clienteId: ordem.clienteId,
      veiculoId: ordem.veiculoId,
      descricaoProblema: resumo.descricaoProblema,
    });
    sagaPassos.inc({ passo: saga.passo, resultado: 'avancou' });
    return this.sagas.save(saga);
  }

  /** Evento de participante, do atendente (`os.cancelamento-manual`) ou do relogio (`saga.timeout`). */
  async processar(evento: EventoSaga, agora: Date = new Date()): Promise<SagaOS> {
    const numero = String(evento.data.numeroOS ?? '');
    const saga = (await this.sagas.findByNumero(numero)) ?? (await this.adotar(numero, agora));
    const passoAntes = saga.passo;
    const entradaNoPasso = saga.updatedAt ?? saga.createdAt ?? agora;

    const resultado = saga.aplicar(evento, agora, prazosDoAmbiente());
    const rotulo = resultado.aplicado ? saga.historico[saga.historico.length - 1]?.resultado ?? 'avancou' : 'ignorado';
    sagaPassos.inc({ passo: passoAntes, resultado: rotulo });

    if (resultado.rejeitado) {
      throw new InvalidStatusTransitionError(passoAntes, 'CANCELADA');
    }
    if (!resultado.aplicado) {
      this.logger.warn({ msg: 'evento ignorado pela saga', numeroOS: numero, type: evento.type, passo: passoAntes, motivo: resultado.motivo });
      await this.sagas.save(saga);
      return saga;
    }

    if (resultado.transicaoOS) await this.transicionar(numero, resultado.transicaoOS, evento);
    const salva = await this.sagas.save(saga);
    if (salva.passo !== passoAntes) {
      sagaPassoDuracao.observe({ passo: passoAntes }, Math.max(0, (agora.getTime() - entradaNoPasso.getTime()) / 1000));
    }
    this.logger.log({
      msg: 'saga avancou',
      numeroOS: numero,
      type: evento.type,
      de: passoAntes,
      para: salva.passo,
      status: salva.status,
      comandos: resultado.comandos.map((c) => c.type),
    });
    return salva;
  }

  private async transicionar(numero: string, t: TransicaoOS, evento: EventoSaga): Promise<void> {
    switch (t.tipo) {
      case 'iniciarDiagnostico':
        await this.enfileiramento.execute({ numero });
        return;
      case 'registrarDiagnostico':
        await this.diagnostico.execute({
          numero,
          mecanicoId: evento.data.mecanicoId,
          diagnostico: evento.data.diagnostico,
          itens: evento.data.itens ?? [],
        });
        return;
      case 'aguardarAprovacao':
        await this.orcamentoGerado.execute({ numero, total: evento.data.total });
        return;
      case 'aguardarPagamento':
        await this.orcamentoAprovado.execute({ numero });
        return;
      case 'iniciarExecucao':
        await this.execucaoIniciada.execute({ numero });
        return;
      case 'finalizar':
        await this.execucaoFinalizada.execute({ numero, causationId: evento.id });
        return;
      case 'cancelar':
        await this.cancelamento.execute({ numero, motivo: t.motivo, causationId: evento.id });
        return;
    }
  }

  /** OS sem saga (anterior a US-F4-10): adota o passo equivalente ao status atual. */
  private async adotar(numero: string, agora: Date): Promise<SagaOS> {
    const ordem = await this.ordens.findByNumero(numero);
    if (!ordem) throw new OrdemDeServicoNotFoundError(numero);
    this.logger.warn({ msg: 'OS sem saga — adotando a partir do status atual', numeroOS: numero, status: ordem.status });
    return this.sagas.save(
      SagaOS.adotar(
        {
          numero,
          clienteId: ordem.clienteId,
          veiculoId: ordem.veiculoId,
          descricaoProblema: ordem.descricaoInicial,
          statusOS: ordem.status,
        },
        agora,
      ),
    );
  }
}
