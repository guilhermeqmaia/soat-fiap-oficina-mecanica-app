import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiRequest } from '@/lib/api-client';
import type {
  OrdemDeServico,
  Paginated,
  Produto,
  StatusOS,
} from '@/lib/api/types';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, StatusBadge } from '@/components/ui/badge';

const STATUS_LIST: StatusOS[] = [
  'RECEBIDA',
  'EM_DIAGNOSTICO',
  'AGUARDANDO_APROVACAO',
  'EM_EXECUCAO',
  'FINALIZADA',
  'ENTREGUE',
  'CANCELADA',
];

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['ordens-servico', 'dashboard'],
    queryFn: () =>
      // incluirEncerradas para que os cards FINALIZADA/ENTREGUE/CANCELADA
      // (excluidos por padrao) tambem sejam contados.
      apiRequest<Paginated<OrdemDeServico>>('/ordens-servico', {
        query: { page: 1, limit: 100, incluirEncerradas: 'true' },
      }),
  });

  const { data: lowStock } = useQuery({
    queryKey: ['estoque-baixo'],
    queryFn: () => apiRequest<Produto[]>('/produtos/estoque-baixo'),
  });

  const counts = STATUS_LIST.reduce<Record<string, number>>((acc, s) => {
    acc[s] = data?.data.filter((o) => o.status === s).length ?? 0;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Visao geral da operacao
        </p>
      </div>
      {isLoading ? (
        <div className="text-slate-500">Carregando...</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {STATUS_LIST.map((status) => (
            <Card key={status}>
              <CardBody>
                <div className="text-3xl font-bold text-slate-900">
                  {counts[status]}
                </div>
                <div className="mt-2">
                  <StatusBadge status={status} />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Estoque baixo</CardTitle>
        </CardHeader>
        <CardBody>
          {lowStock === undefined ? (
            <div className="text-slate-500">Carregando...</div>
          ) : lowStock.length === 0 ? (
            <div className="text-sm text-slate-500">
              Nenhum produto abaixo do minimo. ✅
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-amber-700">
                {lowStock.length} produto(s) com estoque baixo:
              </p>
              <ul className="divide-y divide-slate-100">
                {lowStock.slice(0, 8).map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between py-2"
                  >
                    <Link
                      to={`/produtos/${p.id}/movimentacoes`}
                      className="text-sm font-medium text-slate-900 hover:text-brand-700"
                    >
                      {p.nome}
                    </Link>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-mono text-slate-600">
                        {p.quantidadeEstoque} / min {p.estoqueMinimo}
                      </span>
                      <Badge tone="warning">baixo</Badge>
                    </div>
                  </li>
                ))}
              </ul>
              {lowStock.length > 8 && (
                <Link
                  to="/produtos"
                  className="mt-2 inline-block text-sm text-brand-700 hover:underline"
                >
                  Ver todos os {lowStock.length} →
                </Link>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
