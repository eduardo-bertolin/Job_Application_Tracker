import { create } from "zustand";

interface User {
  id: string;
  email: string;
  name: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  
  login: (user, token) => set({ user, accessToken: token, isAuthenticated: true }),
  
  logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
  
  setToken: (token) => set({ accessToken: token }),
}));
