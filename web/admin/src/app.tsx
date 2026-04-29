import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '@/pages/login';
import { DashboardPage } from '@/pages/dashboard';
import { ClientesListPage } from '@/pages/clientes/list';
import { VeiculosListPage } from '@/pages/veiculos/list';
import { ServicosListPage } from '@/pages/servicos/list';
import { ProdutosListPage } from '@/pages/produtos/list';
import { ProdutoMovimentacoesPage } from '@/pages/produtos/movimentacoes';
import {
  OrdensServicoListPage,
  OrdemServicoDetailPage,
} from '@/pages/ordens-servico';
import { NotificacoesListPage } from '@/pages/notificacoes/list';
import { UsuariosListPage } from '@/pages/usuarios/list';
import { AppShell } from '@/components/app-shell';
import { RequireAuth } from '@/lib/role-guard';
import { Toaster } from '@/components/ui/toast';

export function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route
            path="clientes"
            element={
              <RequireAuth roles={['ADMIN', 'ATENDENTE']}>
                <ClientesListPage />
              </RequireAuth>
            }
          />
          <Route
            path="veiculos"
            element={
              <RequireAuth roles={['ADMIN', 'ATENDENTE']}>
                <VeiculosListPage />
              </RequireAuth>
            }
          />
          <Route
            path="servicos"
            element={
              <RequireAuth roles={['ADMIN']}>
                <ServicosListPage />
              </RequireAuth>
            }
          />
          <Route
            path="produtos"
            element={
              <RequireAuth roles={['ADMIN', 'ESTOQUISTA']}>
                <ProdutosListPage />
              </RequireAuth>
            }
          />
          <Route
            path="produtos/:id/movimentacoes"
            element={
              <RequireAuth roles={['ADMIN', 'ATENDENTE', 'ESTOQUISTA']}>
                <ProdutoMovimentacoesPage />
              </RequireAuth>
            }
          />
          <Route
            path="ordens-servico"
            element={
              <RequireAuth roles={['ADMIN', 'ATENDENTE', 'MECANICO']}>
                <OrdensServicoListPage />
              </RequireAuth>
            }
          />
          <Route
            path="ordens-servico/:id"
            element={
              <RequireAuth roles={['ADMIN', 'ATENDENTE', 'MECANICO']}>
                <OrdemServicoDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path="notificacoes"
            element={
              <RequireAuth roles={['ADMIN', 'ATENDENTE']}>
                <NotificacoesListPage />
              </RequireAuth>
            }
          />
          <Route
            path="usuarios"
            element={
              <RequireAuth roles={['ADMIN']}>
                <UsuariosListPage />
              </RequireAuth>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}
