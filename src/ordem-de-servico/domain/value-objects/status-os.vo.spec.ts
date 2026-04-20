import { StatusOS, StatusOSVO } from './status-os.vo';

describe('StatusOSVO', () => {
  describe('create', () => {
    it('should create a valid status VO with RECEBIDA', () => {
      const status = StatusOSVO.create(StatusOS.RECEBIDA);
      expect(status.valor).toBe(StatusOS.RECEBIDA);
    });

    it('should create a valid status VO with EM_DIAGNOSTICO', () => {
      const status = StatusOSVO.create(StatusOS.EM_DIAGNOSTICO);
      expect(status.valor).toBe(StatusOS.EM_DIAGNOSTICO);
    });

    it('should create a valid status VO with AGUARDANDO_APROVACAO', () => {
      const status = StatusOSVO.create(StatusOS.AGUARDANDO_APROVACAO);
      expect(status.valor).toBe(StatusOS.AGUARDANDO_APROVACAO);
    });

    it('should create a valid status VO with EM_EXECUCAO', () => {
      const status = StatusOSVO.create(StatusOS.EM_EXECUCAO);
      expect(status.valor).toBe(StatusOS.EM_EXECUCAO);
    });

    it('should create a valid status VO with FINALIZADA', () => {
      const status = StatusOSVO.create(StatusOS.FINALIZADA);
      expect(status.valor).toBe(StatusOS.FINALIZADA);
    });

    it('should create a valid status VO with ENTREGUE', () => {
      const status = StatusOSVO.create(StatusOS.ENTREGUE);
      expect(status.valor).toBe(StatusOS.ENTREGUE);
    });

    it('should create a valid status VO with CANCELADA', () => {
      const status = StatusOSVO.create(StatusOS.CANCELADA);
      expect(status.valor).toBe(StatusOS.CANCELADA);
    });

    it('should throw error if invalid status string is passed', () => {
      expect(() => StatusOSVO.create('INVALID_STATUS')).toThrow();
    });
  });

  describe('constructor', () => {
    it('should create instance via constructor with valid enum value', () => {
      const status = new StatusOSVO(StatusOS.RECEBIDA);
      expect(status.valor).toBe(StatusOS.RECEBIDA);
    });

    it('should create instance via constructor with valid string value', () => {
      const status = new StatusOSVO('RECEBIDA');
      expect(status.valor).toBe(StatusOS.RECEBIDA);
    });

    it('should throw error if invalid value is passed', () => {
      expect(() => new StatusOSVO('INVALID')).toThrow();
    });
  });

  describe('equals', () => {
    it('should return true if comparing equal statuses', () => {
      const status1 = StatusOSVO.create(StatusOS.RECEBIDA);
      const status2 = StatusOSVO.create(StatusOS.RECEBIDA);

      expect(status1.equals(status2)).toBe(true);
    });

    it('should return false if comparing different statuses', () => {
      const status1 = StatusOSVO.create(StatusOS.RECEBIDA);
      const status2 = StatusOSVO.create(StatusOS.EM_DIAGNOSTICO);

      expect(status1.equals(status2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return string representation of status', () => {
      const status = StatusOSVO.create(StatusOS.RECEBIDA);
      expect(status.toString()).toBe(StatusOS.RECEBIDA);
    });

    it('should return correct string for all enum values', () => {
      const values = [
        StatusOS.RECEBIDA,
        StatusOS.EM_DIAGNOSTICO,
        StatusOS.AGUARDANDO_APROVACAO,
        StatusOS.EM_EXECUCAO,
        StatusOS.FINALIZADA,
        StatusOS.ENTREGUE,
        StatusOS.CANCELADA,
      ];

      values.forEach((value) => {
        const status = StatusOSVO.create(value);
        expect(status.toString()).toBe(value);
      });
    });
  });
});
