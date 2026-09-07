import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth-store';
import { apiRequest } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface NotificacaoLite {
  id: string;
  createdAt: string;
}

export function ClienteShell() {
  const user = useAuthStore((s) => s.user);
  const cpfCnpj = useAuthStore((s) => s.cpfCnpj);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['notificacoes-count', cpfCnpj],
    queryFn: () =>
      apiRequest<{ data: NotificacaoLite[] }>(
        `/clientes/${cpfCnpj}/notificacoes`,
        { query: { page: 1, limit: 50 } },
      ),
    enabled: !!cpfCnpj,
    retry: false,
    refetchInterval: 30_000,
  });

  // notificacoes nas ultimas 24h sao "novas"
  const limite = Date.now() - 24 * 60 * 60 * 1000;
  const novas =
    data?.data.filter((n) => new Date(n.createdAt).getTime() > limite).length ??
    0;

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-bold text-brand-700">
              Oficina · Portal do Cliente
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 font-medium',
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-700 hover:bg-slate-100',
                  )
                }
              >
                Minhas ordens
              </NavLink>
              <NavLink
                to="/notificacoes"
                className={({ isActive }) =>
                  cn(
                    'relative rounded-md px-3 py-1.5 font-medium',
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-700 hover:bg-slate-100',
                  )
                }
              >
                Notificacoes
                {novas > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">
                    {novas}
                  </span>
                )}
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="text-right">
              <div className="font-medium text-slate-900">{user?.nome}</div>
              <div className="text-xs text-slate-500">{user?.cpf}</div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4">
        <Outlet />
      </main>
    </div>
  );
}
