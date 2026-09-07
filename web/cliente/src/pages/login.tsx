import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, ApiError } from '@/lib/api-client';
import { useAuthStore, type AuthUser } from '@/lib/auth-store';

/**
 * Login por CPF (Fase 3 — US-F3-03): o POST /auth e atendido pela Lambda de
 * autenticacao atras do API Gateway (VITE_API_URL deve apontar para o
 * gateway). A aplicacao nao emite mais tokens.
 */
interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresAt: string;
  cliente: { id: string; nome: string; cpf: string; role: AuthUser['role'] };
}

export function LoginPage() {
  const [cpf, setCpfInput] = useState('390.533.447-05');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setCpf = useAuthStore((s) => s.setCpfCnpj);
  const navigate = useNavigate();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await apiRequest<LoginResponse>('/auth', {
        method: 'POST',
        body: { cpf },
        skipAuth: true,
      });
      setAuth({
        token: data.accessToken,
        user: {
          id: data.cliente.id,
          nome: data.cliente.nome,
          cpf: data.cliente.cpf,
          role: data.cliente.role,
        },
      });
      setCpf(cpf.replace(/\D/g, ''));
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Portal do Cliente
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Informe seu CPF para acompanhar suas ordens de servico
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              CPF
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="username"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpfInput(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
