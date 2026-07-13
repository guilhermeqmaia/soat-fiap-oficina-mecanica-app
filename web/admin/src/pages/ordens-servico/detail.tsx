import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import type {
  AuditLogEntry,
  OrdemDeServico,
  OsDetalhesView,
  Paginated,
  Produto,
  Servico,
  Usuario,
} from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

function ItemExecucaoBadge({
  status,
}: {
  status?: 'PENDENTE' | 'EM_EXECUCAO' | 'CONCLUIDO';
}) {
  if (!status || status === 'PENDENTE') {
    return (
      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
        pendente
      </span>
    );
  }
  if (status === 'EM_EXECUCAO') {
    return (
      <span className={cn(
        'rounded px-2 py-0.5 text-xs font-medium',
        'bg-blue-100 text-blue-700',
      )}>
        em execucao
      </span>
    );
  }
  return (
    <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
      concluido
    </span>
  );
}

// Copy do estado das reservas de peca, derivada do STATUS da OS (a view nao
// expoe a quantidade reservada por peca). Reflete a politica de estoque da
// Fase 2: reserva na inclusao -> baixa em EM_EXECUCAO -> estorno em CANCELADA.
function reservaInfoParaStatus(
  status: OsDetalhesView['cabecalho']['status'],
): { tone: string; text: string } | null {
  switch (status) {
    case 'RECEBIDA':
    case 'EM_DIAGNOSTICO':
    case 'AGUARDANDO_APROVACAO':
      return {
        tone: 'bg-amber-50 text-amber-800 border-amber-200',
        text: 'Pecas reservadas em estoque — ainda nao baixadas. A baixa ocorre quando a OS entra em execucao.',
      };
    case 'EM_EXECUCAO':
    case 'FINALIZADA':
    case 'ENTREGUE':
      return {
        tone: 'bg-green-50 text-green-800 border-green-200',
        text: 'Pecas baixadas do estoque (consumo confirmado na execucao).',
      };
    case 'CANCELADA':
      return {
        tone: 'bg-slate-50 text-slate-600 border-slate-200',
        text: 'Reservas de pecas estornadas ao estoque (OS cancelada).',
      };
    default:
      return null;
  }
}

export function OrdemServicoDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');

  const { data: os, isLoading } = useQuery({
    queryKey: ['ordens-servico', id],
    queryFn: () => apiRequest<OsDetalhesView>(`/ordens-servico/${id}`),
    enabled: !!id,
  });

  const { data: auditLog } = useQuery({
    queryKey: ['ordens-servico', id, 'audit-log'],
    queryFn: () =>
      apiRequest<AuditLogEntry[]>(`/ordens-servico/${id}/audit-log`),
    enabled: !!id,
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

  const { data: usuarios } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => apiRequest<Usuario[] | Paginated<Usuario>>('/usuario'),
  });

  const mecanicos: Usuario[] = (() => {
    if (!usuarios) return [];
    const arr = Array.isArray(usuarios) ? usuarios : usuarios.data;
    return arr.filter((u) => u.role === 'MECANICO' && u.ativo);
  })();

  const callMutation = (path: string, body?: unknown) =>
    apiRequest<OrdemDeServico>(`/ordens-servico/${id}/${path}`, {
      method: 'POST',
      body,
    });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['ordens-servico', id] });

  const atribuirMut = useMutation({
    mutationFn: (usuarioId: string) =>
      callMutation('atribuir-mecanico', { usuarioId }),
    onSuccess: () => {
      toast('Mecanico atribuido', 'success');
      invalidate();
      qc.invalidateQueries({ queryKey: ['ordens-servico'] });
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const adicionarServicoMut = useMutation({
    mutationFn: (input: { servicoId: string; quantidade: number }) =>
      callMutation('servicos', input),
    onSuccess: () => {
      toast('Servico adicionado', 'success');
      invalidate();
      setShowAddServico(false);
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const removerServicoMut = useMutation({
    mutationFn: (servicoId: string) =>
      apiRequest(`/ordens-servico/${id}/servicos/${servicoId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast('Servico removido', 'success');
      invalidate();
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const adicionarProdutoMut = useMutation({
    mutationFn: (input: {
      servicoId: string;
      produtoId: string;
      quantidade: number;
    }) =>
      apiRequest<OrdemDeServico>(
        `/ordens-servico/${id}/servicos/${input.servicoId}/produtos`,
        {
          method: 'POST',
          body: { produtoId: input.produtoId, quantidade: input.quantidade },
        },
      ),
    onSuccess: () => {
      toast('Produto vinculado ao servico', 'success');
      invalidate();
      // A inclusao reserva estoque — atualiza catalogo/estoque exibido.
      qc.invalidateQueries({ queryKey: ['produtos'] });
      setShowAddProduto(null);
      setNovoProdutoId('');
      setNovoProdutoQtd(1);
      setAddProdutoErro(null);
    },
    onError: (e: Error) => {
      // Estoque insuficiente chega como 409; mostra inline no modal.
      const status = (e as { status?: number }).status;
      if (status === 409) {
        setAddProdutoErro(e.message);
      } else {
        toast(e.message, 'error');
      }
    },
  });

  const removerProdutoMut = useMutation({
    mutationFn: (input: { servicoId: string; produtoId: string }) =>
      apiRequest(
        `/ordens-servico/${id}/servicos/${input.servicoId}/produtos/${input.produtoId}`,
        { method: 'DELETE' },
      ),
    onSuccess: () => {
      toast('Produto removido do servico', 'success');
      invalidate();
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const iniciarServicoMut = useMutation({
    mutationFn: (servicoId: string) =>
      apiRequest<OrdemDeServico>(
        `/ordens-servico/${id}/servicos/${servicoId}/iniciar`,
        { method: 'PATCH' },
      ),
    onSuccess: () => {
      toast('Servico iniciado — relogio rodando', 'success');
      invalidate();
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const concluirServicoMut = useMutation({
    mutationFn: (input: { servicoId: string; horasTrabalhadas: number }) =>
      apiRequest<OrdemDeServico>(
        `/ordens-servico/${id}/servicos/${input.servicoId}/concluir`,
        {
          method: 'PATCH',
          body: { horasTrabalhadas: input.horasTrabalhadas },
        },
      ),
    onSuccess: () => {
      toast('Servico concluido', 'success');
      invalidate();
      qc.invalidateQueries({ queryKey: ['ordens-servico'] });
      setShowConcluirServico(null);
      setHorasTrabalhadas(1);
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const completarMut = useMutation({
    mutationFn: (diagnostico: string) =>
      callMutation('completar-diagnostico', { diagnostico }),
    onSuccess: () => {
      toast('Diagnostico concluido — orcamento enviado', 'success');
      invalidate();
      qc.invalidateQueries({ queryKey: ['ordens-servico'] });
      setShowDiag(false);
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const aprovarMut = useMutation({
    mutationFn: () => callMutation('aprovar-orcamento'),
    onSuccess: () => {
      toast('Orcamento aprovado', 'success');
      invalidate();
      qc.invalidateQueries({ queryKey: ['ordens-servico'] });
      // Aprovacao leva a EM_EXECUCAO -> baixa de estoque das pecas.
      qc.invalidateQueries({ queryKey: ['produtos'] });
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const rejeitarMut = useMutation({
    mutationFn: () => callMutation('rejeitar-orcamento'),
    onSuccess: () => {
      toast('Orcamento rejeitado', 'success');
      invalidate();
      qc.invalidateQueries({ queryKey: ['ordens-servico'] });
      // Rejeicao leva a CANCELADA -> estorno das reservas de peca.
      qc.invalidateQueries({ queryKey: ['produtos'] });
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const finalizarMut = useMutation({
    mutationFn: () => callMutation('finalizar-execucao'),
    onSuccess: () => {
      toast('Execucao finalizada', 'success');
      invalidate();
      qc.invalidateQueries({ queryKey: ['ordens-servico'] });
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const entregarMut = useMutation({
    mutationFn: () => callMutation('entregar'),
    onSuccess: () => {
      toast('OS entregue ao cliente', 'success');
      invalidate();
      qc.invalidateQueries({ queryKey: ['ordens-servico'] });
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const deletarMut = useMutation({
    mutationFn: () => apiRequest(`/ordens-servico/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast('OS deletada', 'success');
      qc.invalidateQueries({ queryKey: ['ordens-servico'] });
      // Deletar uma OS pre-execucao estorna as reservas -> estoque muda.
      qc.invalidateQueries({ queryKey: ['produtos'] });
      navigate('/ordens-servico');
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const [showAddServico, setShowAddServico] = useState(false);
  const [showDiag, setShowDiag] = useState(false);
  const [diagText, setDiagText] = useState('');
  const [novoServicoId, setNovoServicoId] = useState('');
  const [novoServicoQtd, setNovoServicoQtd] = useState(1);
  // servicoId atualmente aberto no modal de adicionar produto
  const [showAddProduto, setShowAddProduto] = useState<string | null>(null);
  const [novoProdutoId, setNovoProdutoId] = useState('');
  const [novoProdutoQtd, setNovoProdutoQtd] = useState(1);
  const [addProdutoErro, setAddProdutoErro] = useState<string | null>(null);
  // servicoId atualmente aberto no modal de concluir (registro de horas)
  const [showConcluirServico, setShowConcluirServico] = useState<string | null>(
    null,
  );
  const [horasTrabalhadas, setHorasTrabalhadas] = useState<number>(1);
  const [showAuditLog, setShowAuditLog] = useState(false);

  if (isLoading || !os) {
    return <div className="text-slate-500">Carregando...</div>;
  }

  const status = os.cabecalho.status;
  const cliente = os.cabecalho.dadosCliente;
  const veiculo = os.cabecalho.dadosVeiculo;
  const itens = os.corpo.servicos;

  const servicoNomeNaOs = (sid: string) =>
    itens.find((s) => s.servicoId === sid)?.descricaoServico ?? sid;

  const temPecas = itens.some((s) => s.produtos.length > 0);
  const reservaInfo = temPecas ? reservaInfoParaStatus(status) : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/ordens-servico"
          className="text-sm text-brand-700 hover:underline"
        >
          ← Voltar
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{os.cabecalho.numero}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <StatusBadge status={status} />
            <span>Mecanico: {os.cabecalho.mecanicoAtribuido ?? '-'}</span>
            <span>
              Atualizada em {os.cabecalho.dataHoraUltimaAtualizacao ?? '-'}
            </span>
          </div>
        </div>
        {isAdmin && (
          <Button
            variant="ghost"
            className="text-red-600 hover:bg-red-50"
            disabled={deletarMut.isPending}
            onClick={() => {
              if (
                confirm(
                  'Deletar esta OS? Se ela ainda nao entrou em execucao, as reservas de peca serao estornadas ao estoque.',
                )
              )
                deletarMut.mutate();
            }}
          >
            Deletar OS
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
          </CardHeader>
          <CardBody className="text-sm">
            <p className="font-medium">{cliente.nome}</p>
            <p className="text-slate-500">CPF/CNPJ: {cliente.cpfCnpj || '-'}</p>
            <p className="text-slate-500">Email: {cliente.email ?? '-'}</p>
            <p className="text-slate-500">Telefone: {cliente.telefone || '-'}</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Veiculo</CardTitle>
          </CardHeader>
          <CardBody className="text-sm">
            <p className="font-mono text-base">{veiculo.placa || '-'}</p>
            <p>
              {veiculo.marca} {veiculo.modelo}
              {veiculo.ano ? ` (${veiculo.ano})` : ''}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Descricao inicial</CardTitle>
        </CardHeader>
        <CardBody className="text-sm whitespace-pre-wrap">
          {os.corpo.descricaoInicial}
        </CardBody>
      </Card>

      {os.corpo.diagnostico && (
        <Card>
          <CardHeader>
            <CardTitle>Diagnostico</CardTitle>
          </CardHeader>
          <CardBody className="text-sm whitespace-pre-wrap">
            {os.corpo.diagnostico}
          </CardBody>
        </Card>
      )}

      {/* Acoes por status */}
      <Card>
        <CardHeader>
          <CardTitle>Acoes</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-wrap gap-2">
          {status === 'RECEBIDA' && (
            <Select
              className="max-w-xs"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) atribuirMut.mutate(e.target.value);
              }}
            >
              <option value="">Atribuir mecanico…</option>
              {mecanicos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </Select>
          )}

          {status === 'EM_DIAGNOSTICO' && (
            <>
              <Button onClick={() => setShowAddServico(true)}>
                + Servico
              </Button>
              <Button
                variant="primary"
                onClick={() => setShowDiag(true)}
                disabled={itens.length === 0}
                title={
                  itens.length === 0
                    ? 'Adicione pelo menos um servico antes'
                    : ''
                }
              >
                Concluir diagnostico
              </Button>
            </>
          )}

          {status === 'AGUARDANDO_APROVACAO' &&
            (isAdmin ? (
              <>
                <Button
                  onClick={() => aprovarMut.mutate()}
                  disabled={aprovarMut.isPending}
                >
                  Aprovar (em nome do cliente)
                </Button>
                <Button
                  variant="danger"
                  onClick={() => rejeitarMut.mutate()}
                  disabled={rejeitarMut.isPending}
                >
                  Rejeitar
                </Button>
              </>
            ) : (
              <p className="text-sm text-slate-600">
                A aprovacao ou rejeicao do orcamento e feita pelo cliente no
                portal, ou por um usuario ADMIN em nome do cliente.
              </p>
            ))}

          {status === 'EM_EXECUCAO' && (
            <div className="flex w-full flex-col gap-2">
              <p className="text-sm text-slate-600">
                Inicie e conclua cada servico individualmente nos cards abaixo.
                A OS vai para FINALIZADA automaticamente quando todos forem
                concluidos. O botao abaixo encerra a execucao manualmente
                (legado).
              </p>
              <div>
                <Button
                  variant="outline"
                  onClick={() => finalizarMut.mutate()}
                  disabled={finalizarMut.isPending}
                >
                  Finalizar execucao manualmente
                </Button>
              </div>
            </div>
          )}

          {status === 'FINALIZADA' && (
            <Button
              onClick={() => entregarMut.mutate()}
              disabled={entregarMut.isPending}
            >
              Confirmar entrega ao cliente
            </Button>
          )}

          {(status === 'ENTREGUE' || status === 'CANCELADA') && (
            <p className="text-sm text-slate-500">
              OS encerrada — sem acoes disponiveis.
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Servicos e produtos</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          {reservaInfo && (
            <div
              className={cn(
                'rounded-md border px-3 py-2 text-xs',
                reservaInfo.tone,
              )}
            >
              {reservaInfo.text}
            </div>
          )}
          {status === 'EM_DIAGNOSTICO' && temPecas && (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Remover um servico ou peca aqui <strong>nao</strong> estorna a
              reserva de estoque automaticamente (diferente do cancelamento da
              OS, que estorna). Ajuste o estoque manualmente se precisar.
            </div>
          )}
          {itens.length === 0 && (
            <div className="py-6 text-center text-sm text-slate-500">
              Sem servicos adicionados.
            </div>
          )}
          {itens.map((i) => {
            const subtotalServico = i.valorTotalDesseServico;
            const subtotalProdutos = i.produtos.reduce(
              (s, p) => s + p.valorTotalDesseProduto,
              0,
            );
            return (
              <div
                key={i.servicoId}
                className="rounded-md border border-slate-200 bg-white"
              >
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-slate-900">
                        {i.descricaoServico}
                      </div>
                      <ItemExecucaoBadge status={i.statusExecucao} />
                    </div>
                    <div className="text-xs text-slate-500">
                      {i.quantidade} ×{' '}
                      {formatCurrency(Number(i.precoUnitario))} ={' '}
                      {formatCurrency(subtotalServico)}
                      {subtotalProdutos > 0 && (
                        <>
                          {' '}
                          + produtos {formatCurrency(subtotalProdutos)} ={' '}
                          <strong>
                            {formatCurrency(subtotalServico + subtotalProdutos)}
                          </strong>
                        </>
                      )}
                      {i.statusExecucao === 'CONCLUIDO' && i.fimExecucao && (
                        <>
                          {' '}
                          · concluido em {formatDate(i.fimExecucao)}
                          {i.horasTrabalhadas
                            ? ` (${i.horasTrabalhadas}h trabalhadas)`
                            : ''}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {status === 'EM_DIAGNOSTICO' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setNovoProdutoId('');
                            setNovoProdutoQtd(1);
                            setAddProdutoErro(null);
                            setShowAddProduto(i.servicoId);
                          }}
                        >
                          + Produto
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => removerServicoMut.mutate(i.servicoId)}
                        >
                          Remover servico
                        </Button>
                      </>
                    )}
                    {status === 'EM_EXECUCAO' &&
                      i.statusExecucao === 'PENDENTE' && (
                        <Button
                          size="sm"
                          onClick={() => iniciarServicoMut.mutate(i.servicoId)}
                          disabled={iniciarServicoMut.isPending}
                        >
                          Iniciar
                        </Button>
                      )}
                    {status === 'EM_EXECUCAO' &&
                      i.statusExecucao === 'EM_EXECUCAO' && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            // Pre-preenche o campo com o tempo decorrido desde
                            // o "Iniciar". Mecanico pode ajustar antes de salvar.
                            const inicio = i.inicioExecucao
                              ? new Date(i.inicioExecucao).getTime()
                              : null;
                            const horasDecorridas = inicio
                              ? Math.max(
                                  0.1,
                                  Number(
                                    ((Date.now() - inicio) / 3_600_000).toFixed(2),
                                  ),
                                )
                              : 1;
                            setHorasTrabalhadas(horasDecorridas);
                            setShowConcluirServico(i.servicoId);
                          }}
                        >
                          Concluir
                        </Button>
                      )}
                  </div>
                </div>
                <Table>
                  <THead>
                    <TR>
                      <TH>Produto</TH>
                      <TH className="text-right">Qtd</TH>
                      <TH className="text-right">Preco unit.</TH>
                      <TH className="text-right">Subtotal</TH>
                      <TH></TH>
                    </TR>
                  </THead>
                  <TBody>
                    {i.produtos.map((p) => (
                      <TR key={p.produtoId}>
                        <TD>{p.descricaoProduto}</TD>
                        <TD className="text-right">{p.quantidade}</TD>
                        <TD className="text-right">
                          {formatCurrency(Number(p.precoUnitario))}
                        </TD>
                        <TD className="text-right">
                          {formatCurrency(p.valorTotalDesseProduto)}
                        </TD>
                        <TD className="text-right">
                          {status === 'EM_DIAGNOSTICO' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() =>
                                removerProdutoMut.mutate({
                                  servicoId: i.servicoId,
                                  produtoId: p.produtoId,
                                })
                              }
                            >
                              Remover
                            </Button>
                          )}
                        </TD>
                      </TR>
                    ))}
                    {i.produtos.length === 0 && (
                      <TR>
                        <TD
                          colSpan={5}
                          className="py-4 text-center text-xs text-slate-500"
                        >
                          Nenhum produto vinculado a este servico
                          {status === 'EM_DIAGNOSTICO' &&
                            ' — use "+ Produto" para adicionar'}
                        </TD>
                      </TR>
                    )}
                  </TBody>
                </Table>
              </div>
            );
          })}
          <div className="mt-4 space-y-1 text-right text-sm">
            <div>Servicos: {formatCurrency(os.rodape.valorTotalServicos)}</div>
            <div>Produtos: {formatCurrency(os.rodape.valorTotalProdutos)}</div>
            <div className="text-lg font-semibold">
              Total: {formatCurrency(os.rodape.valorTotalOrdemServico)}
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Historico (audit log)</CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowAuditLog((v) => !v)}
          >
            {showAuditLog ? 'Ocultar' : `Mostrar (${auditLog?.length ?? 0})`}
          </Button>
        </CardHeader>
        {showAuditLog && (
          <CardBody>
            {(auditLog?.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhum registro de auditoria.
              </p>
            ) : (
              <ol className="space-y-3">
                {auditLog!.map((log) => (
                  <li
                    key={log.id}
                    className="border-l-2 border-slate-200 pl-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900">
                        {log.acao}
                      </span>
                      {log.statusAnterior && log.statusNovo && (
                        <span className="text-xs text-slate-500">
                          {log.statusAnterior} → {log.statusNovo}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {formatDate(log.createdAt)}
                      {log.usuarioId
                        ? ` · usuario ${log.usuarioId.slice(0, 8)}`
                        : ''}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        )}
      </Card>

      <Dialog
        open={showAddServico}
        onClose={() => setShowAddServico(false)}
        title="Adicionar servico"
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            adicionarServicoMut.mutate({
              servicoId: novoServicoId,
              quantidade: novoServicoQtd,
            });
          }}
          className="space-y-4"
        >
          <div>
            <Label>Servico *</Label>
            <Select
              value={novoServicoId}
              onChange={(e) => setNovoServicoId(e.target.value)}
              required
            >
              <option value="">Selecione</option>
              {servicos?.data.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome} — {formatCurrency(Number(s.precoBase))}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Quantidade *</Label>
            <Input
              type="number"
              min={1}
              value={novoServicoQtd}
              onChange={(e) => setNovoServicoQtd(Number(e.target.value))}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowAddServico(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={adicionarServicoMut.isPending}>
              Adicionar
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={showDiag}
        onClose={() => setShowDiag(false)}
        title="Concluir diagnostico"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            completarMut.mutate(diagText);
          }}
          className="space-y-4"
        >
          <div>
            <Label>Diagnostico *</Label>
            <textarea
              value={diagText}
              onChange={(e) => setDiagText(e.target.value)}
              minLength={5}
              maxLength={1000}
              rows={6}
              required
              className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Descreva o problema diagnosticado..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowDiag(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={completarMut.isPending}>
              Concluir
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={showConcluirServico !== null}
        onClose={() => setShowConcluirServico(null)}
        title={`Concluir servico${
          showConcluirServico ? ` "${servicoNomeNaOs(showConcluirServico)}"` : ''
        }`}
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!showConcluirServico) return;
            concluirServicoMut.mutate({
              servicoId: showConcluirServico,
              horasTrabalhadas,
            });
          }}
          className="space-y-4"
        >
          <div>
            <Label>Horas trabalhadas *</Label>
            <Input
              type="number"
              min={0.1}
              step={0.1}
              value={horasTrabalhadas}
              onChange={(e) => setHorasTrabalhadas(Number(e.target.value))}
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Pre-preenchido com o tempo decorrido desde o "Iniciar" — ajuste se
              voce trabalhou de forma intermitente. Este valor (e nao o tempo de
              relogio) alimenta as metricas de tempo medio.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowConcluirServico(null)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={concluirServicoMut.isPending}>
              Registrar conclusao
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={showAddProduto !== null}
        onClose={() => setShowAddProduto(null)}
        title={`Adicionar produto ao servico${
          showAddProduto ? ` "${servicoNomeNaOs(showAddProduto)}"` : ''
        }`}
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!showAddProduto) return;
            adicionarProdutoMut.mutate({
              servicoId: showAddProduto,
              produtoId: novoProdutoId,
              quantidade: novoProdutoQtd,
            });
          }}
          className="space-y-4"
        >
          <div>
            <Label>Produto *</Label>
            <Select
              value={novoProdutoId}
              onChange={(e) => setNovoProdutoId(e.target.value)}
              required
            >
              <option value="">Selecione</option>
              {(produtos?.data ?? [])
                .filter((p) => p.ativo)
                .map((p) => {
                  const disponivel =
                    p.quantidadeDisponivel ?? p.quantidadeEstoque;
                  return (
                    <option
                      key={p.id}
                      value={p.id}
                      disabled={disponivel <= 0}
                    >
                      {p.nome} — {formatCurrency(Number(p.precoUnitario))}{' '}
                      (estoque {disponivel}
                      {disponivel <= 0 ? ' — indisponivel' : ''})
                    </option>
                  );
                })}
            </Select>
          </div>
          <div>
            <Label>Quantidade *</Label>
            <Input
              type="number"
              min={1}
              value={novoProdutoQtd}
              onChange={(e) => setNovoProdutoQtd(Number(e.target.value))}
              required
            />
          </div>
          {addProdutoErro && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {addProdutoErro}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowAddProduto(null)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={adicionarProdutoMut.isPending}>
              Adicionar
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
