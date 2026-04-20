import request from 'supertest';
import app from '../../src/server';

describe('POST /ordens-servico/:id/produtos', () => {
  it('deve adicionar um produto com estoque disponível', async () => {
    const res = await request(app)
      .post('/ordens-servico/os-001/produtos')
      .send({ produtoId: 'prod-001', quantidade: 2 });

    expect(res.status).toBe(201);
    expect(res.body.item.nomeProduto).toBe('Filtro de Óleo');
    expect(res.body.item.valorTotal).toBeCloseTo(71.8);
  });

  it('deve retornar 422 quando produto sem estoque (Policy v3)', async () => {
    const res = await request(app)
      .post('/ordens-servico/os-001/produtos')
      .send({ produtoId: 'prod-003', quantidade: 1 });

    expect(res.status).toBe(422);
    expect(res.body.detalhes.nomeProduto).toBe('Vela de Ignição');
  });

  it('deve retornar 404 quando OS não encontrada', async () => {
    const res = await request(app)
      .post('/ordens-servico/os-inexistente/produtos')
      .send({ produtoId: 'prod-001', quantidade: 1 });

    expect(res.status).toBe(404);
  });

  it('deve retornar 400 quando body inválido', async () => {
    const res = await request(app)
      .post('/ordens-servico/os-001/produtos')
      .send({});

    expect(res.status).toBe(400);
  });

  it('deve retornar erro ao adicionar em OS com status diferente de EM_DIAGNOSTICO', async () => {
    const res = await request(app)
      .post('/ordens-servico/os-002/produtos')
      .send({ produtoId: 'prod-001', quantidade: 1 });

    expect(res.status).toBe(500);
  });
});

describe('DELETE /ordens-servico/:id/produtos/:produtoId', () => {
  it('deve remover produto previamente adicionado e estornar reserva', async () => {
    await request(app)
      .post('/ordens-servico/os-001/produtos')
      .send({ produtoId: 'prod-002', quantidade: 1 });

    const res = await request(app)
      .delete('/ordens-servico/os-001/produtos/prod-002');

    expect(res.status).toBe(200);
    expect(res.body.itemRemovido.produtoId).toBe('prod-002');
  });

  it('deve retornar 404 quando OS não encontrada', async () => {
    const res = await request(app)
      .delete('/ordens-servico/os-inexistente/produtos/prod-001');

    expect(res.status).toBe(404);
  });
});
