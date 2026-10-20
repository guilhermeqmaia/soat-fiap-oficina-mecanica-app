import { ManutencaoMensageriaService } from './manutencao-mensageria.service';

describe('ManutencaoMensageriaService', () => {
  const prisma = { outbox: { deleteMany: jest.fn() }, processedMessage: { deleteMany: jest.fn() } } as any;
  beforeEach(() => jest.clearAllMocks());

  it('purga ENVIADA e processed_messages alem da retencao (default 7 dias)', async () => {
    prisma.outbox.deleteMany.mockResolvedValue({ count: 3 });
    prisma.processedMessage.deleteMany.mockResolvedValue({ count: 5 });
    const antes = Date.now();
    const r = await new ManutencaoMensageriaService(prisma).purgar();
    expect(r).toEqual({ outbox: 3, processed: 5 });
    const limite: Date = prisma.outbox.deleteMany.mock.calls[0][0].where.enviadaEm.lt;
    expect(antes - limite.getTime()).toBeGreaterThanOrEqual(7 * 24 * 3600 * 1000 - 1000);
    expect(prisma.outbox.deleteMany.mock.calls[0][0].where.status).toBe('ENVIADA');
  });

  it('nao agenda nada com MESSAGING_AUTOSTART=false', () => {
    const svc = new ManutencaoMensageriaService(prisma);
    const old = process.env.MESSAGING_AUTOSTART;
    process.env.MESSAGING_AUTOSTART = 'false';
    svc.onApplicationBootstrap();
    expect((svc as any).timer).toBeUndefined();
    process.env.MESSAGING_AUTOSTART = old;
    svc.onApplicationShutdown();
  });

  it('agenda e cancela o timer no ciclo de vida', () => {
    const svc = new ManutencaoMensageriaService(prisma);
    const old = process.env.MESSAGING_AUTOSTART;
    delete process.env.MESSAGING_AUTOSTART;
    svc.onApplicationBootstrap();
    expect((svc as any).timer).toBeDefined();
    svc.onApplicationShutdown();
    process.env.MESSAGING_AUTOSTART = old;
  });
});
