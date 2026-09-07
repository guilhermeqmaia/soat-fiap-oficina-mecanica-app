import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role =
  | 'ADMIN'
  | 'ATENDENTE'
  | 'MECANICO'
  | 'ESTOQUISTA'
  | 'CLIENTE';

export interface AuthUser {
  id: string;
  nome: string;
  /** CPF mascarado devolvido pela Lambda de autenticacao (Fase 3). */
  cpf?: string | null;
  role: Role;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (data: { token: string; user: AuthUser }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: ({ token, user }) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'oficina-admin-auth' },
  ),
);
