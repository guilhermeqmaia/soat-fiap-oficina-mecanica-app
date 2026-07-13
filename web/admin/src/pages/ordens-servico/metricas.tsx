import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import type {
  Paginated,
  Servico,
  TempoMedioExecucao,
} from '@/lib/api/types';
import { Card, CardBody } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';

function formatMinutos(minutos: number): string {
  if (!minutos) return '0min';
  const horas = Math.floor(minutos / 60);
  const restoMin = Math.round(minutos % 60);
  if (horas === 0) return `${restoMin}min`;
  if (restoMin === 0) return `${horas}h`;
  return `${horas}h ${restoMin}min`;
}

export function OrdensServicoMetricasPage() {
  const [servicoId, setServicoId] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtros, setFiltros] = useState<{
    servicoId?: string;
    dataInicio?: string;
    dataFim?: string;
  }>({});

  const { data: servicos } = useQuery({
    queryKey: ['servicos', 'all'],
    queryFn: () =>
      apiRequest<Paginated<Servico>>('/servicos', {
        query: { page: 1, limit: 100 },
      }),
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['ordens-servico', 'tempo-medio', filtros],
    queryFn: () =>
      apiRequest<TempoMedioExecucao>('/ordens-servico/metricas/tempo-medio', {
        query: {
          servicoId: filtros.servicoId || undefined,
          dataInicio: filtros.dataInicio
            ? new Date(filtros.dataInicio).toISOString()
            : undefined,
          dataFim: filtros.dataFim
            ? new Date(`${filtros.dataFim}T23:59:59.999`).toISOString()
            : undefined,
        },
      }),
  });

  const aplicar = () => {
    setFiltros({
      servicoId: servicoId || undefined,
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
    });
  };

  const limpar = () => {
    setServicoId('');
    setDataInicio('');
    setDataFim('');
    setFiltros({});
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Metricas — Tempo medio de execucao
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Tempo medio entre o inicio e a conclusao dos servicos executados,
          calculado a partir dos itens com status CONCLUIDO. Atende ao monitoramento
          previsto pela US-17.
        </p>
      </div>

      <Card>
        <CardBody className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label htmlFor="servico">Servico (catalogo)</Label>
              <Select
                id="servico"
                value={servicoId}
                onChange={(e) => setServicoId(e.target.value)}
              >
                <option value="">Todos</option>
                {servicos?.data
                  .filter((s) => s.ativo)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="dataInicio">Concluidos desde</Label>
              <Input
                id="dataInicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dataFim">Concluidos ate</Label>
              <Input
                id="dataFim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={aplicar} disabled={isFetching}>
                Aplicar
              </Button>
              <Button variant="outline" onClick={limpar} disabled={isFetching}>
                Limpar
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardBody>
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Tempo medio geral
            </div>
            <div className="mt-2 text-3xl font-bold text-brand-700">
              {isLoading ? '…' : formatMinutos(data?.tempoMedioGeralMinutos ?? 0)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {data?.tempoMedioGeralMinutos.toFixed(1) ?? '0'} minutos
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Servicos concluidos
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">
              {isLoading ? '…' : data?.totalServicosConcluidos ?? 0}
            </div>
            <div className="mt-1 text-xs text-slate-500">no periodo filtrado</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Tipos de servico
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">
              {isLoading ? '…' : data?.porServico.length ?? 0}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              servicos diferentes executados
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Quebra por servico
            </h2>
            {isFetching && (
              <span className="text-xs text-slate-500">Atualizando…</span>
            )}
          </div>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-slate-500">
              Carregando…
            </div>
          ) : !data || data.porServico.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              Nenhum servico concluido encontrado para os filtros selecionados.
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Servico</TH>
                  <TH className="text-right">Concluidos</TH>
                  <TH className="text-right">Tempo medio</TH>
                  <TH className="text-right">Em minutos</TH>
                </TR>
              </THead>
              <TBody>
                {data.porServico.map((s) => (
                  <TR key={s.servicoId}>
                    <TD className="font-medium text-slate-900">
                      {s.servicoNome}
                    </TD>
                    <TD className="text-right">{s.totalConcluidos}</TD>
                    <TD className="text-right">
                      {formatMinutos(s.tempoMedioMinutos)}
                    </TD>
                    <TD className="text-right text-slate-500">
                      {s.tempoMedioMinutos.toFixed(1)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
