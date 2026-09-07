import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, ApiError } from '@/lib/api-client';
import { useAuthStore, type AuthUser } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardBody } from '@/components/ui/card';

/**
 * Login do staff por CPF + senha (Fase 3 — US-F3-03/RFC-0003): o POST /auth e
 * atendido pela Lambda de autenticacao atras do API Gateway (VITE_API_URL
 * deve apontar para o gateway). A aplicacao nao emite mais tokens.
 */
interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresAt: string;
  usuario: { id: string; nome: string; cpf: string; role: AuthUser['role'] };
}

export function LoginPage() {
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await apiRequest<LoginResponse>('/auth', {
        method: 'POST',
        body: { cpf, senha },
        skipAuth: true,
      });
      if (data.usuario.role === 'CLIENTE') {
        setError(
          'Este painel e exclusivo da equipe da oficina. Use o portal do cliente.',
        );
        return;
      }
      setAuth({
        token: data.accessToken,
        user: {
          id: data.usuario.id,
          nome: data.usuario.nome,
          cpf: data.usuario.cpf,
          role: data.usuario.role,
        },
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Erro ao autenticar',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardBody>
          <h1 className="text-2xl font-bold text-slate-900">
            Painel Administrativo
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Acesso para equipe da oficina (CPF + senha)
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                type="text"
                inputMode="numeric"
                autoComplete="username"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
