import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";

export type UserRole = "officer" | "planner" | "individual";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  fetchCurrentUser: () => Promise<void>;
}

export interface RegisterData {
  email: string;
  password: string;
  confirm_password: string;
  full_name: string;
  role: UserRole;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post("/api/auth/login", { email, password });

          const token: string = data.access_token;
          const user: User = data.user;

          if (typeof window !== "undefined") {
            localStorage.setItem("chronos_token", token);
            document.cookie = `chronos_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
            document.cookie = `chronos_role=${user.role}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
          }

          set({ token, user, isLoading: false });
        } catch (err: unknown) {
          const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
          const message = Array.isArray(detail)
            ? detail.map((e: { msg?: string }) => e.msg ?? String(e)).join("; ")
            : (typeof detail === "string" ? detail : null) || "Login failed. Please check your credentials.";
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });
        try {
          await api.post("/api/auth/register", data);
          await get().login(data.email, data.password);
        } catch (err: unknown) {
          const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
          const message = Array.isArray(detail)
            ? detail.map((e: { msg?: string }) => e.msg ?? String(e)).join("; ")
            : (typeof detail === "string" ? detail : null) || "Registration failed.";
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("chronos_token");
          document.cookie = "chronos_token=; path=/; max-age=0";
          document.cookie = "chronos_role=; path=/; max-age=0";
        }
        set({ user: null, token: null, error: null });
      },

      clearError: () => set({ error: null }),

      fetchCurrentUser: async () => {
        try {
          const { data } = await api.get<User>("/api/auth/me");
          set({ user: data });
        } catch {
          set({ user: null, token: null });
          if (typeof window !== "undefined") {
            localStorage.removeItem("chronos_token");
          }
        }
      },
    }),
    {
      name: "chronos-auth",
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
