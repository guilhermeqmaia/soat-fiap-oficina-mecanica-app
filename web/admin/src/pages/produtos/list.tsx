import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import type { Paginated, Produto } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardBody } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { formatCurrency } from '@/lib/utils';

interface FormState {
  id?: string;
  nome: string;
  descricao: string;
  precoUnitario: number;
  quantidadeEstoque: number;
  estoqueMinimo: number;
}

interface MovimentacaoModalState {
  produto: Produto;
  tipo: 'ENTRADA' | 'SAIDA';
  quantidade: number;
  motivo: string;
}

const empty: FormState = {
  nome: '',
  descricao: '',
  precoUnitario: 0,
  quantidadeEstoque: 0,
  estoqueMinimo: 0,
};

const EMPTY_PRODUTOS: Produto[] = [];
const MOTIVO_MAX_LEN = 500;

const isLowStock = (p: Produto) =>
  p.alertaEstoqueBaixo ?? p.quantidadeEstoque <= p.estoqueMinimo;

const disponivelDe = (p: Produto) =>
  p.quantidadeDisponivel ?? p.quantidadeEstoque - p.quantidadeReservada;

export function ProdutosListPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);
  const [movModal, setMovModal] = useState<MovimentacaoModalState | null>(null);
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['produtos'],
    queryFn: () =>
      apiRequest<Paginated<Produto>>('/produtos', {
        query: { page: 1, limit: 100 },
      }),
  });

  const produtos = data?.data ?? EMPTY_PRODUTOS;
  const filtered = useMemo(
    () => (onlyLowStock ? produtos.filter(isLowStock) : produtos),
    [produtos, onlyLowStock],
  );

  const createMut = useMutation({
    mutationFn: (input: FormState) =>
      apiRequest('/produtos', {
        method: 'POST',
        body: {
          nome: input.nome,
          descricao: input.descricao || undefined,
          precoUnitario: Number(input.precoUnitario),
          quantidadeEstoque: Number(input.quantidadeEstoque),
          estoqueMinimo: Number(input.estoqueMinimo),
        },
      }),
    onSuccess: () => {
      toast('Produto cadastrado', 'success');
      qc.invalidateQueries({ queryKey: ['produtos'] });
      setForm(null);
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const updateMut = useMutation({
    mutationFn: (input: FormState) =>
      apiRequest(`/produtos/${input.id}`, {
        method: 'PATCH',
        body: {
          nome: input.nome,
          descricao: input.descricao || undefined,
          precoUnitario: Number(input.precoUnitario),
          estoqueMinimo: Number(input.estoqueMinimo),
        },
      }),
    onSuccess: () => {
      toast('Produto atualizado', 'success');
      qc.invalidateQueries({ queryKey: ['produtos'] });
      setForm(null);
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const movMut = useMutation({
    mutationFn: (m: MovimentacaoModalState) =>
      apiRequest(
        `/produtos/${m.produto.id}/${m.tipo === 'ENTRADA' ? 'entrada' : 'saida'}`,
        {
          method: 'POST',
          body: {
            quantidade: m.quantidade,
            motivo: m.motivo || undefined,
          },
        },
      ),
    onSuccess: (_d, vars) => {
      toast(
        vars.tipo === 'ENTRADA'
          ? 'Entrada registrada'
          : 'Saida registrada',
        'success',
      );
      qc.invalidateQueries({ queryKey: ['produtos'] });
      qc.invalidateQueries({ queryKey: ['estoque-baixo'] });
      setMovModal(null);
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/produtos/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast('Produto removido', 'success');
      qc.invalidateQueries({ queryKey: ['produtos'] });
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (form.id) updateMut.mutate(form);
    else createMut.mutate(form);
  };

  const totalLowStock = produtos.filter(isLowStock).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produtos / Estoque</h1>
          <p className="text-sm text-slate-500">
            {data?.total ?? 0} produto(s)
            {totalLowStock > 0 && (
              <>
                {' '}
                ·{' '}
                <span className="font-medium text-amber-700">
                  {totalLowStock} com estoque baixo
                </span>
              </>
            )}
          </p>
        </div>
        <Button onClick={() => setForm({ ...empty })}>+ Novo Produto</Button>
      </div>
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={onlyLowStock}
                onChange={(e) => setOnlyLowStock(e.target.checked)}
                className="h-4 w-4"
              />
              Apenas estoque baixo
            </label>
            <span className="text-xs text-slate-500">
              ({filtered.length} resultado{filtered.length === 1 ? '' : 's'})
            </span>
          </div>
          {isLoading ? (
            <div>Carregando...</div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Nome</TH>
                  <TH className="text-right">Preco</TH>
                  <TH className="text-right">Estoque</TH>
                  <TH className="text-right">Reservado</TH>
                  <TH className="text-right">Disponivel</TH>
                  <TH className="text-right">Min.</TH>
                  <TH className="text-right">Acoes</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((p) => {
                  const baixo = isLowStock(p);
                  return (
                    <TR key={p.id}>
                      <TD className="font-medium">
                        {p.nome}{' '}
                        {baixo && (
                          <Badge tone="warning" className="ml-2">
                            estoque baixo
                          </Badge>
                        )}
                      </TD>
                      <TD className="text-right">
                        {formatCurrency(Number(p.precoUnitario))}
                      </TD>
                      <TD className="text-right font-mono">
                        {p.quantidadeEstoque}
                      </TD>
                      <TD className="text-right font-mono">
                        {p.quantidadeReservada}
                      </TD>
                      <TD className="text-right font-mono font-medium">
                        {disponivelDe(p)}
                      </TD>
                      <TD className="text-right font-mono text-slate-500">
                        {p.estoqueMinimo}
                      </TD>
                      <TD className="text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setMovModal({
                              produto: p,
                              tipo: 'ENTRADA',
                              quantidade: 0,
                              motivo: '',
                            })
                          }
                        >
                          + Entrada
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-2"
                          onClick={() =>
                            setMovModal({
                              produto: p,
                              tipo: 'SAIDA',
                              quantidade: 0,
                              motivo: '',
                            })
                          }
                        >
                          − Saida
                        </Button>
                        <Link to={`/produtos/${p.id}/movimentacoes`}>
                          <Button size="sm" variant="ghost" className="ml-2">
                            Movs.
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-2"
                          onClick={() =>
                            setForm({
                              id: p.id,
                              nome: p.nome,
                              descricao: p.descricao ?? '',
                              precoUnitario: Number(p.precoUnitario),
                              quantidadeEstoque: p.quantidadeEstoque,
                              estoqueMinimo: p.estoqueMinimo,
                            })
                          }
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-2 text-red-600 hover:bg-red-50"
                          onClick={() => {
                            if (confirm(`Remover ${p.nome}?`))
                              deleteMut.mutate(p.id);
                          }}
                        >
                          Remover
                        </Button>
                      </TD>
                    </TR>
                  );
                })}
                {filtered.length === 0 && (
                  <TR>
                    <TD colSpan={7} className="py-8 text-center text-slate-500">
                      {onlyLowStock
                        ? 'Nenhum produto com estoque baixo'
                        : 'Nenhum produto cadastrado'}
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Dialog
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? 'Editar produto' : 'Novo produto'}
      >
        {form && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Descricao</Label>
              <Input
                value={form.descricao}
                onChange={(e) =>
                  setForm({ ...form, descricao: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Preco *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.precoUnitario}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      precoUnitario: Number(e.target.value),
                    })
                  }
                  required
                />
              </div>
              <div>
                <Label>Estoque inicial *</Label>
                <Input
                  type="number"
                  value={form.quantidadeEstoque}
                  disabled={!!form.id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      quantidadeEstoque: Number(e.target.value),
                    })
                  }
                  required
                />
              </div>
              <div>
                <Label>Estoque min. *</Label>
                <Input
                  type="number"
                  value={form.estoqueMinimo}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      estoqueMinimo: Number(e.target.value),
                    })
                  }
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setForm(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMut.isPending || updateMut.isPending}
              >
                Salvar
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      <Dialog
        open={movModal !== null}
        onClose={() => setMovModal(null)}
        title={
          movModal?.tipo === 'ENTRADA'
            ? 'Registrar entrada de estoque'
            : 'Registrar saida de estoque'
        }
        size="sm"
      >
        {movModal && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              movMut.mutate(movModal);
            }}
            className="space-y-4"
          >
            <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              <span className="font-medium">{movModal.produto.nome}</span>
              <div className="mt-1 grid grid-cols-3 gap-2 text-xs text-slate-500">
                <div>
                  Estoque:{' '}
                  <span className="font-mono text-slate-900">
                    {movModal.produto.quantidadeEstoque}
                  </span>
                </div>
                <div>
                  Reservado:{' '}
                  <span className="font-mono text-slate-900">
                    {movModal.produto.quantidadeReservada}
                  </span>
                </div>
                <div>
                  Disponivel:{' '}
                  <span className="font-mono text-slate-900">
                    {disponivelDe(movModal.produto)}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <Label>Quantidade *</Label>
              <Input
                type="number"
                min={1}
                value={movModal.quantidade || ''}
                onChange={(e) =>
                  setMovModal({
                    ...movModal,
                    quantidade: Number(e.target.value),
                  })
                }
                required
              />
              {movModal.tipo === 'SAIDA' &&
                movModal.quantidade > disponivelDe(movModal.produto) && (
                  <p className="mt-1 text-xs text-red-600">
                    Excede o disponivel ({disponivelDe(movModal.produto)})
                  </p>
                )}
            </div>
            <div>
              <Label>Motivo</Label>
              <Input
                value={movModal.motivo}
                onChange={(e) =>
                  setMovModal({ ...movModal, motivo: e.target.value })
                }
                maxLength={MOTIVO_MAX_LEN}
                placeholder={
                  movModal.tipo === 'ENTRADA'
                    ? 'Compra fornecedor X, ajuste...'
                    : 'Perda, ajuste de inventario...'
                }
              />
              <p className="mt-1 text-xs text-slate-400">
                {movModal.motivo.length}/{MOTIVO_MAX_LEN}
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setMovModal(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  movMut.isPending ||
                  movModal.quantidade <= 0 ||
                  (movModal.tipo === 'SAIDA' &&
                    movModal.quantidade > disponivelDe(movModal.produto))
                }
              >
                Confirmar
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
