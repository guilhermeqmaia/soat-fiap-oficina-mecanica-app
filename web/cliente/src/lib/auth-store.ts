import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  nome: string;
  /** CPF mascarado devolvido pela Lambda de autenticacao (Fase 3). */
  cpf?: string | null;
  role: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  cpfCnpj: string | null;
  setAuth: (data: { token: string; user: AuthUser }) => void;
  setCpfCnpj: (v: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      cpfCnpj: null,
      setAuth: ({ token, user }) => set({ token, user }),
      setCpfCnpj: (cpfCnpj) => set({ cpfCnpj }),
      logout: () => set({ token: null, user: null, cpfCnpj: null }),
    }),
    { name: 'oficina-cliente-auth' },
  ),
);
