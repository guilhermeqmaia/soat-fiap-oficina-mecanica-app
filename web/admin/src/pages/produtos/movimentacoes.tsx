import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '@/lib/api-client';
import type {
  MovimentacaoEstoque,
  Paginated,
  Produto,
  TipoMovimentacaoEstoque,
} from '@/lib/api/types';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { formatDate } from '@/lib/utils';

const TIPO_TONE: Record<TipoMovimentacaoEstoque, 'success' | 'danger' | 'info' | 'warning' | 'purple'> = {
  ENTRADA: 'success',
  SAIDA: 'danger',
  RESERVA: 'info',
  ESTORNO_RESERVA: 'warning',
  BAIXA: 'purple',
};

const TIPO_SIGN: Record<TipoMovimentacaoEstoque, '+' | '-' | '~'> = {
  ENTRADA: '+',
  SAIDA: '-',
  RESERVA: '~',
  ESTORNO_RESERVA: '~',
  BAIXA: '-',
};

export function ProdutoMovimentacoesPage() {
  const { id = '' } = useParams<{ id: string }>();
  const [tipoFilter, setTipoFilter] = useState<string>('');

  const { data: produto } = useQuery({
    queryKey: ['produto', id],
    queryFn: () => apiRequest<Produto>(`/produtos/${id}`),
    enabled: !!id,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['produto-movimentacoes', id, tipoFilter],
    queryFn: () =>
      apiRequest<Paginated<MovimentacaoEstoque>>(
        `/produtos/${id}/movimentacoes`,
        {
          query: {
            page: 1,
            limit: 100,
            ...(tipoFilter ? { tipo: tipoFilter } : {}),
          },
        },
      ),
    enabled: !!id,
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/produtos"
          className="text-sm text-brand-700 hover:underline"
        >
          ← Voltar para produtos
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Movimentacoes</h1>
        {produto && (
          <p className="text-sm text-slate-500">{produto.nome}</p>
        )}
      </div>

      {produto && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardBody>
              <div className="text-xs text-slate-500">Estoque</div>
              <div className="text-2xl font-bold">
                {produto.quantidadeEstoque}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="text-xs text-slate-500">Reservado</div>
              <div className="text-2xl font-bold">
                {produto.quantidadeReservada}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="text-xs text-slate-500">Disponivel</div>
              <div className="text-2xl font-bold">
                {produto.quantidadeDisponivel ??
                  produto.quantidadeEstoque - produto.quantidadeReservada}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="text-xs text-slate-500">Minimo</div>
              <div className="text-2xl font-bold text-slate-500">
                {produto.estoqueMinimo}
              </div>
              {(produto.alertaEstoqueBaixo ??
                produto.quantidadeEstoque <= produto.estoqueMinimo) && (
                <Badge tone="warning" className="mt-2">
                  estoque baixo
                </Badge>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Historico ({data?.total ?? 0})</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Filtrar por tipo
            </label>
            <Select
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value)}
              className="w-64"
            >
              <option value="">Todos os tipos</option>
              <option value="ENTRADA">ENTRADA</option>
              <option value="SAIDA">SAIDA</option>
              <option value="RESERVA">RESERVA</option>
              <option value="ESTORNO_RESERVA">ESTORNO RESERVA</option>
              <option value="BAIXA">BAIXA</option>
            </Select>
          </div>

          {isLoading ? (
            <div>Carregando...</div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Quando</TH>
                  <TH>Tipo</TH>
                  <TH className="text-right">Quantidade</TH>
                  <TH className="text-right">Estoque resultante</TH>
                  <TH>Motivo / Origem</TH>
                </TR>
              </THead>
              <TBody>
                {data?.data.map((m) => (
                  <TR key={m.id}>
                    <TD>{formatDate(m.createdAt)}</TD>
                    <TD>
                      <Badge tone={TIPO_TONE[m.tipo]}>{m.tipo}</Badge>
                    </TD>
                    <TD className="text-right font-mono">
                      <span
                        className={
                          TIPO_SIGN[m.tipo] === '+'
                            ? 'text-green-700'
                            : TIPO_SIGN[m.tipo] === '-'
                              ? 'text-red-700'
                              : 'text-slate-600'
                        }
                      >
                        {TIPO_SIGN[m.tipo]}
                        {m.quantidade}
                      </span>
                    </TD>
                    <TD className="text-right font-mono">
                      {m.estoqueResultante}
                    </TD>
                    <TD className="text-sm text-slate-600">
                      {m.motivo ?? '-'}
                      {m.ordemDeServicoId && (
                        <span className="ml-2 text-xs text-slate-400 font-mono">
                          OS:{m.ordemDeServicoId.slice(0, 8)}
                        </span>
                      )}
                    </TD>
                  </TR>
                ))}
                {(data?.data.length ?? 0) === 0 && (
                  <TR>
                    <TD colSpan={5} className="py-8 text-center text-slate-500">
                      Nenhuma movimentacao registrada
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
