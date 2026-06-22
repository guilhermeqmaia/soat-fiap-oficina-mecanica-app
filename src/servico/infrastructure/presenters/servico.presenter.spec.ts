import { ServicoPresenter } from './servico.presenter';
import { Servico } from '../../domain/servico.entity';

function fakeServico() {
  return Servico.reconstitute({
    id: 'srv-1',
    nome: 'Troca de oleo',
    descricao: 'Troca de oleo com filtro',
    precoBase: 149.9,
    tempoEstimadoHoras: 1.5,
    ativo: true,
  });
}

describe('ServicoPresenter', () => {
  it('flattens a Servico entity into the response shape', () => {
    const res = ServicoPresenter.toResponse(fakeServico());

    expect(res.id).toBe('srv-1');
    expect(res.nome).toBe('Troca de oleo');
    expect(res.descricao).toBe('Troca de oleo com filtro');
    expect(res.precoBase).toBe(149.9);
    expect(res.tempoEstimadoHoras).toBe(1.5);
    expect(res.ativo).toBe(true);
  });

  it('maps a paginated result', () => {
    const res = ServicoPresenter.toPaginatedResponse({
      data: [fakeServico()],
      total: 1,
      page: 1,
      limit: 10,
    });

    expect(res.total).toBe(1);
    expect(res.page).toBe(1);
    expect(res.limit).toBe(10);
    expect(res.data).toHaveLength(1);
    expect(res.data[0].nome).toBe('Troca de oleo');
    expect(res.data[0].precoBase).toBe(149.9);
  });
});
