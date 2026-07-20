import { api } from "./api.js";
import { useAuthStore } from "../stores/authStore.js";

interface AuthResponse {
  user: { id: string; email: string; name: string | null };
  accessToken: string;
}

export const authService = {
  async register(data: any): Promise<void> {
    const response = await api.post<AuthResponse>("/auth/register", data);
    useAuthStore.getState().login(response.data.user, response.data.accessToken);
  },

  async login(data: any): Promise<void> {
    const response = await api.post<AuthResponse>("/auth/login", data);
    useAuthStore.getState().login(response.data.user, response.data.accessToken);
  },

  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } finally {
      // Always clear local state even if server request fails
      useAuthStore.getState().logout();
    }
  },

  async fetchMe(): Promise<void> {
    const response = await api.get("/auth/me");
    const token = useAuthStore.getState().accessToken;
    if (token) {
        useAuthStore.getState().login(response.data.user, token);
    }
  },
};
