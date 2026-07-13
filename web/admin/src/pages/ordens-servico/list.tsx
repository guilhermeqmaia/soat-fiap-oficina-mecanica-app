import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiRequest } from '@/lib/api-client';
import type {
  Cliente,
  CreateOrdemDeServicoRequest,
  OrdemDeServico,
  Paginated,
  Produto,
  Servico,
  StatusOS,
  Veiculo,
} from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardBody } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { toast } from '@/components/ui/toast';
import { formatCurrency, formatDate } from '@/lib/utils';

const STATUS_OPTIONS: StatusOS[] = [
  'RECEBIDA',
  'EM_DIAGNOSTICO',
  'AGUARDANDO_APROVACAO',
  'EM_EXECUCAO',
  'FINALIZADA',
  'ENTREGUE',
  'CANCELADA',
];

// Status que o atendente/mecanico precisa agir primeiro — realca na listagem.
// O backend ja devolve a lista ordenada por prioridade; aqui so damos enfase.
const STATUS_PRIORITARIOS: StatusOS[] = ['EM_EXECUCAO', 'AGUARDANDO_APROVACAO'];

// Rascunho da abertura de OS com itens iniciais (US-F2 / abertura com pecas).
interface DraftProduto {
  produtoId: string;
  quantidade: number;
}
interface DraftServico {
  servicoId: string;
  quantidade: number;
  produtos: DraftProduto[];
}

export function OrdensServicoListPage() {
  const qc = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [clienteId, setClienteId] = useState('');
  const [veiculoId, setVeiculoId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [itens, setItens] = useState<DraftServico[]>([]);
  const [createErro, setCreateErro] = useState<string | null>(null);

  // Filtros da listagem
  const [statusFilter, setStatusFilter] = useState<'' | StatusOS>('');
  const [numeroFilter, setNumeroFilter] = useState('');
  const [incluirEncerradas, setIncluirEncerradas] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: [
      'ordens-servico',
      { statusFilter, numeroFilter, incluirEncerradas, page },
    ],
    queryFn: () =>
      apiRequest<Paginated<OrdemDeServico>>('/ordens-servico', {
        query: {
          page,
          limit,
          status: statusFilter || undefined,
          numero: numeroFilter || undefined,
          incluirEncerradas: incluirEncerradas ? 'true' : undefined,
        },
      }),
    placeholderData: (prev) => prev,
  });

  const { data: clientes } = useQuery({
    queryKey: ['clientes', 'all'],
    queryFn: () =>
      apiRequest<Paginated<Cliente>>('/clientes', {
        query: { page: 1, limit: 100 },
      }),
  });

  const { data: veiculos } = useQuery({
    queryKey: ['veiculos', 'all'],
    queryFn: () =>
      apiRequest<Paginated<Veiculo>>('/veiculos', {
        query: { page: 1, limit: 100 },
      }),
  });

  const { data: servicos } = useQuery({
    queryKey: ['servicos'],
    queryFn: () =>
      apiRequest<Paginated<Servico>>('/servicos', {
        query: { page: 1, limit: 100 },
      }),
  });

  const { data: produtos } = useQuery({
    queryKey: ['produtos', 'all'],
    queryFn: () =>
      apiRequest<Paginated<Produto>>('/produtos', {
        query: { page: 1, limit: 100 },
      }),
  });

  const veiculosCliente =
    veiculos?.data.filter((v) => v.clienteId === clienteId) ?? [];

  const resetForm = () => {
    setClienteId('');
    setVeiculoId('');
    setDescricao('');
    setItens([]);
    setCreateErro(null);
  };

  const createMut = useMutation({
    mutationFn: () => {
      const servicosPayload = itens
        .filter((it) => it.servicoId)
        .map((it) => {
          const pecas = it.produtos
            .filter((p) => p.produtoId)
            .map((p) => ({ produtoId: p.produtoId, quantidade: p.quantidade }));
          return {
            servicoId: it.servicoId,
            quantidade: it.quantidade,
            ...(pecas.length ? { produtos: pecas } : {}),
          };
        });
      const body: CreateOrdemDeServicoRequest = {
        clienteId,
        veiculoId,
        descricaoInicial: descricao,
        ...(servicosPayload.length ? { servicos: servicosPayload } : {}),
      };
      return apiRequest<OrdemDeServico>('/ordens-servico', {
        method: 'POST',
        body,
      });
    },
    onSuccess: () => {
      toast('OS criada', 'success');
      qc.invalidateQueries({ queryKey: ['ordens-servico'] });
      // Estoque muda quando a abertura ja reserva pecas.
      qc.invalidateQueries({ queryKey: ['produtos'] });
      setOpenCreate(false);
      resetForm();
    },
    onError: (e: Error) => {
      // Estoque insuficiente para as pecas declaradas -> 409, mostra inline.
      const status = (e as { status?: number }).status;
      if (status === 409) {
        setCreateErro(e.message);
      } else {
        toast(e.message, 'error');
      }
    },
  });

  // Mutadores imutaveis do rascunho de itens
  const addServico = () =>
    setItens((prev) => [
      ...prev,
      { servicoId: '', quantidade: 1, produtos: [] },
    ]);
  const removeServico = (idx: number) =>
    setItens((prev) => prev.filter((_, i) => i !== idx));
  const patchServico = (idx: number, patch: Partial<DraftServico>) =>
    setItens((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    );
  const addProduto = (idx: number) =>
    setItens((prev) =>
      prev.map((it, i) =>
        i === idx
          ? { ...it, produtos: [...it.produtos, { produtoId: '', quantidade: 1 }] }
          : it,
      ),
    );
  const removeProduto = (idx: number, pidx: number) =>
    setItens((prev) =>
      prev.map((it, i) =>
        i === idx
          ? { ...it, produtos: it.produtos.filter((_, j) => j !== pidx) }
          : it,
      ),
    );
  const patchProduto = (idx: number, pidx: number, patch: Partial<DraftProduto>) =>
    setItens((prev) =>
      prev.map((it, i) =>
        i === idx
          ? {
              ...it,
              produtos: it.produtos.map((p, j) =>
                j === pidx ? { ...p, ...patch } : p,
              ),
            }
          : it,
      ),
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ordens de Servico</h1>
          <p className="text-sm text-slate-500">{data?.total ?? 0} OS(s)</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setOpenCreate(true);
          }}
        >
          + Nova OS
        </Button>
      </div>

      <Card>
        <CardBody className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Status</Label>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as '' | StatusOS);
                setPage(1);
              }}
            >
              <option value="">Todos os ativos</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Numero</Label>
            <Input
              value={numeroFilter}
              onChange={(e) => {
                setNumeroFilter(e.target.value);
                setPage(1);
              }}
              placeholder="OS-001"
            />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={incluirEncerradas}
              onChange={(e) => {
                setIncluirEncerradas(e.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 rounded border-slate-300"
            />
            Incluir encerradas (FINALIZADA / ENTREGUE)
          </label>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {isLoading ? (
            <div>Carregando...</div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Numero</TH>
                  <TH>Status</TH>
                  <TH>Descricao inicial</TH>
                  <TH>Atualizada</TH>
                  <TH className="text-right">Acoes</TH>
                </TR>
              </THead>
              <TBody>
                {data?.data.map((os) => (
                  <TR key={os.id}>
                    <TD className="font-mono text-xs">{os.numero}</TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={os.status} />
                        {STATUS_PRIORITARIOS.includes(os.status) && (
                          <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brand-700">
                            prioridade
                          </span>
                        )}
                      </div>
                    </TD>
                    <TD className="max-w-md truncate">
                      {os.descricaoInicial}
                    </TD>
                    <TD>{formatDate(os.updatedAt)}</TD>
                    <TD className="text-right">
                      <Link to={`/ordens-servico/${os.id}`}>
                        <Button size="sm" variant="outline">
                          Detalhes
                        </Button>
                      </Link>
                    </TD>
                  </TR>
                ))}
                {data?.data.length === 0 && (
                  <TR>
                    <TD colSpan={5} className="py-8 text-center text-slate-500">
                      Nenhuma OS encontrada com os filtros atuais
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          )}
          <Pagination
            page={page}
            limit={limit}
            total={data?.total ?? 0}
            onPageChange={setPage}
          />
        </CardBody>
      </Card>

      <Dialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title="Nova ordem de servico"
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setCreateErro(null);
            createMut.mutate();
          }}
          className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
        >
          <div>
            <Label>Cliente *</Label>
            <Select
              value={clienteId}
              onChange={(e) => {
                setClienteId(e.target.value);
                setVeiculoId('');
              }}
              required
            >
              <option value="">Selecione</option>
              {clientes?.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} ({c.cpfCnpj})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Veiculo *</Label>
            <Select
              value={veiculoId}
              onChange={(e) => setVeiculoId(e.target.value)}
              required
              disabled={!clienteId}
            >
              <option value="">
                {clienteId ? 'Selecione' : 'Escolha um cliente primeiro'}
              </option>
              {veiculosCliente.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.placa} — {v.marca} {v.modelo}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Descricao inicial *</Label>
            <Input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
              minLength={5}
              placeholder="Cliente relata barulho ao frenar..."
            />
          </div>

          {/* Servicos e pecas iniciais (opcional) — reservam estoque na abertura */}
          <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">
                  Servicos iniciais (opcional)
                </p>
                <p className="text-xs text-slate-500">
                  As pecas informadas aqui ja reservam estoque na abertura.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addServico}
              >
                + Servico
              </Button>
            </div>

            {itens.length === 0 && (
              <p className="text-xs text-slate-400">
                Nenhum servico declarado — a OS pode abrir so com a descricao e
                receber servicos depois, no diagnostico.
              </p>
            )}

            {itens.map((it, idx) => (
              <div
                key={idx}
                className="space-y-2 rounded-md border border-slate-200 bg-white p-3"
              >
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label>Servico</Label>
                    <Select
                      value={it.servicoId}
                      onChange={(e) =>
                        patchServico(idx, { servicoId: e.target.value })
                      }
                      required
                    >
                      <option value="">Selecione</option>
                      {servicos?.data
                        .filter((s) => s.ativo)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nome} — {formatCurrency(Number(s.precoBase))}
                          </option>
                        ))}
                    </Select>
                  </div>
                  <div className="w-20">
                    <Label>Qtd</Label>
                    <Input
                      type="number"
                      min={1}
                      value={it.quantidade}
                      onChange={(e) =>
                        patchServico(idx, {
                          quantidade: Number(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => removeServico(idx)}
                  >
                    Remover
                  </Button>
                </div>

                {/* Pecas do servico */}
                <div className="space-y-2 border-l-2 border-slate-100 pl-3">
                  {it.produtos.map((p, pidx) => (
                    <div key={pidx} className="flex items-end gap-2">
                      <div className="flex-1">
                        <Label>Peca</Label>
                        <Select
                          value={p.produtoId}
                          onChange={(e) =>
                            patchProduto(idx, pidx, {
                              produtoId: e.target.value,
                            })
                          }
                          required
                        >
                          <option value="">Selecione</option>
                          {(produtos?.data ?? [])
                            .filter((prod) => prod.ativo)
                            .map((prod) => {
                              const disponivel =
                                prod.quantidadeDisponivel ??
                                prod.quantidadeEstoque;
                              return (
                                <option
                                  key={prod.id}
                                  value={prod.id}
                                  disabled={disponivel <= 0}
                                >
                                  {prod.nome} (estoque {disponivel}
                                  {disponivel <= 0 ? ' — indisponivel' : ''})
                                </option>
                              );
                            })}
                        </Select>
                      </div>
                      <div className="w-20">
                        <Label>Qtd</Label>
                        <Input
                          type="number"
                          min={1}
                          value={p.quantidade}
                          onChange={(e) =>
                            patchProduto(idx, pidx, {
                              quantidade: Number(e.target.value),
                            })
                          }
                          required
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => removeProduto(idx, pidx)}
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => addProduto(idx)}
                  >
                    + Peca
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {createErro && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {createErro}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setOpenCreate(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createMut.isPending}>
              Criar
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
