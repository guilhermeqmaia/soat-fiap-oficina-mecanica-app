import { OrdemDeServico } from './ordem-de-servico.entity';
import { StatusOS } from './value-objects/status-os.vo';
import { InvalidDescricaoError } from './errors/invalid-descricao.error';
import { InvalidStatusTransitionError } from './errors/invalid-status-transition.error';

describe('OrdemDeServico Entity', () => {
  describe('create', () => {
    it('should create a new ordem de servico with RECEBIDA status', () => {
      const props = {
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        descricaoInicial: 'Cliente relata problemas no freio',
      };

      const os = OrdemDeServico.create(props);

      expect(os).toBeDefined();
      expect(os.clienteId).toBe(props.clienteId);
      expect(os.veiculoId).toBe(props.veiculoId);
      expect(os.descricaoInicial).toBe(props.descricaoInicial);
      expect(os.status).toBe(StatusOS.RECEBIDA);
      expect(os.usuarioId).toBeNull();
      expect(os.diagnostico).toBeNull();
      expect(os.numero).toMatch(/^OS-\d{4}-\d{5}$/);
    });

    it('should throw InvalidDescricaoError if descricaoInicial is too short', () => {
      const props = {
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        descricaoInicial: 'abc',
      };

      expect(() => OrdemDeServico.create(props)).toThrow(InvalidDescricaoError);
    });

    it('should throw InvalidDescricaoError if descricaoInicial exceeds max length', () => {
      const props = {
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        descricaoInicial: 'a'.repeat(501),
      };

      expect(() => OrdemDeServico.create(props)).toThrow(InvalidDescricaoError);
    });

    it('should throw InvalidDescricaoError if descricaoInicial is empty', () => {
      const props = {
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        descricaoInicial: '',
      };

      expect(() => OrdemDeServico.create(props)).toThrow(InvalidDescricaoError);
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute an ordem de servico from persisted data', () => {
      const props = {
        id: 'os-123',
        numero: 'OS-2026-00001',
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        usuarioId: 'usuario-789',
        descricaoInicial: 'Cliente relata problemas no freio',
        diagnostico: 'Pastilhas desgastadas',
        status: StatusOS.EM_DIAGNOSTICO,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const os = OrdemDeServico.reconstitute(props);

      expect(os.id).toBe(props.id);
      expect(os.numero).toBe(props.numero);
      expect(os.clienteId).toBe(props.clienteId);
      expect(os.status).toBe(StatusOS.EM_DIAGNOSTICO);
      expect(os.usuarioId).toBe(props.usuarioId);
      expect(os.diagnostico).toBe(props.diagnostico);
    });
  });

  describe('atribuirMecanico', () => {
    it('should assign a mechanic to the ordem de servico', () => {
      const os = OrdemDeServico.create({
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        descricaoInicial: 'Cliente relata problemas no freio',
      });

      os.atribuirMecanico('usuario-789');

      expect(os.usuarioId).toBe('usuario-789');
      expect(os.status).toBe(StatusOS.EM_DIAGNOSTICO);
    });

    it('should throw error if trying to assign mechanic when OS is not RECEBIDA', () => {
      const os = OrdemDeServico.reconstitute({
        id: 'os-123',
        numero: 'OS-2026-00001',
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        usuarioId: null,
        descricaoInicial: 'Cliente relata problemas no freio',
        diagnostico: null,
        status: StatusOS.EM_DIAGNOSTICO,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(() => os.atribuirMecanico('usuario-789')).toThrow(
        InvalidStatusTransitionError,
      );
    });
  });

  describe('completarDiagnostico', () => {
    it('should complete diagnosis and transition to AGUARDANDO_APROVACAO', () => {
      const os = OrdemDeServico.create({
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        descricaoInicial: 'Cliente relata problemas no freio',
      });

      os.atribuirMecanico('usuario-789');
      os.completarDiagnostico('Pastilhas desgastadas. Necessario troca');

      expect(os.diagnostico).toBe('Pastilhas desgastadas. Necessario troca');
      expect(os.status).toBe(StatusOS.AGUARDANDO_APROVACAO);
    });

    it('should throw error if diagnostico is too short', () => {
      const os = OrdemDeServico.create({
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        descricaoInicial: 'Cliente relata problemas no freio',
      });

      os.atribuirMecanico('usuario-789');

      expect(() => os.completarDiagnostico('abc')).toThrow(InvalidDescricaoError);
    });

    it('should throw error if diagnostico exceeds max length', () => {
      const os = OrdemDeServico.create({
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        descricaoInicial: 'Cliente relata problemas no freio',
      });

      os.atribuirMecanico('usuario-789');

      expect(() => os.completarDiagnostico('a'.repeat(1001))).toThrow(
        InvalidDescricaoError,
      );
    });

    it('should throw error if trying to complete diagnosis when status is not EM_DIAGNOSTICO', () => {
      const os = OrdemDeServico.create({
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        descricaoInicial: 'Cliente relata problemas no freio',
      });

      expect(() => os.completarDiagnostico('Diagnostico')).toThrow(
        InvalidStatusTransitionError,
      );
    });
  });

  describe('aprovar', () => {
    it('should approve budget and transition to EM_EXECUCAO', () => {
      const os = OrdemDeServico.reconstitute({
        id: 'os-123',
        numero: 'OS-2026-00001',
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        usuarioId: 'usuario-789',
        descricaoInicial: 'Cliente relata problemas no freio',
        diagnostico: 'Pastilhas desgastadas',
        status: StatusOS.AGUARDANDO_APROVACAO,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      os.aprovar();

      expect(os.status).toBe(StatusOS.EM_EXECUCAO);
    });

    it('should throw error if trying to approve when status is not AGUARDANDO_APROVACAO', () => {
      const os = OrdemDeServico.create({
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        descricaoInicial: 'Cliente relata problemas no freio',
      });

      expect(() => os.aprovar()).toThrow(InvalidStatusTransitionError);
    });
  });

  describe('rejeitar', () => {
    it('should reject budget and transition to CANCELADA', () => {
      const os = OrdemDeServico.reconstitute({
        id: 'os-123',
        numero: 'OS-2026-00001',
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        usuarioId: 'usuario-789',
        descricaoInicial: 'Cliente relata problemas no freio',
        diagnostico: 'Pastilhas desgastadas',
        status: StatusOS.AGUARDANDO_APROVACAO,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      os.rejeitar();

      expect(os.status).toBe(StatusOS.CANCELADA);
    });

    it('should throw error if trying to reject when status is not AGUARDANDO_APROVACAO', () => {
      const os = OrdemDeServico.create({
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        descricaoInicial: 'Cliente relata problemas no freio',
      });

      expect(() => os.rejeitar()).toThrow(InvalidStatusTransitionError);
    });
  });

  describe('finalizarExecucao', () => {
    it('should finalize execution and transition to FINALIZADA', () => {
      const os = OrdemDeServico.reconstitute({
        id: 'os-123',
        numero: 'OS-2026-00001',
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        usuarioId: 'usuario-789',
        descricaoInicial: 'Cliente relata problemas no freio',
        diagnostico: 'Pastilhas desgastadas',
        status: StatusOS.EM_EXECUCAO,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      os.finalizarExecucao();

      expect(os.status).toBe(StatusOS.FINALIZADA);
    });

    it('should throw error if trying to finalize when status is not EM_EXECUCAO', () => {
      const os = OrdemDeServico.create({
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        descricaoInicial: 'Cliente relata problemas no freio',
      });

      expect(() => os.finalizarExecucao()).toThrow(InvalidStatusTransitionError);
    });
  });

  describe('entregar', () => {
    it('should deliver vehicle and transition to ENTREGUE', () => {
      const os = OrdemDeServico.reconstitute({
        id: 'os-123',
        numero: 'OS-2026-00001',
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        usuarioId: 'usuario-789',
        descricaoInicial: 'Cliente relata problemas no freio',
        diagnostico: 'Pastilhas desgastadas',
        status: StatusOS.FINALIZADA,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      os.entregar();

      expect(os.status).toBe(StatusOS.ENTREGUE);
    });

    it('should throw error if trying to deliver when status is not FINALIZADA', () => {
      const os = OrdemDeServico.create({
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        descricaoInicial: 'Cliente relata problemas no freio',
      });

      expect(() => os.entregar()).toThrow(InvalidStatusTransitionError);
    });
  });

  describe('getters', () => {
    it('should return all properties via getters', () => {
      const props = {
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        descricaoInicial: 'Cliente relata problemas no freio',
      };

      const os = OrdemDeServico.create(props);

      expect(os.clienteId).toBe(props.clienteId);
      expect(os.veiculoId).toBe(props.veiculoId);
      expect(os.descricaoInicial).toBe(props.descricaoInicial);
      expect(os.numero).toBeDefined();
      expect(os.status).toBe(StatusOS.RECEBIDA);
      expect(os.usuarioId).toBeNull();
      expect(os.diagnostico).toBeNull();
    });
  });
});
