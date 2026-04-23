"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ApiUser } from "@/lib/api";
import { apiFetch } from "@/lib/api";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: ApiUser | null;
  setSession: (
    accessToken: string | null,
    refreshToken: string | null,
    user: ApiUser | null,
  ) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: (accessToken, refreshToken, user) =>
        set({ accessToken, refreshToken, user }),
      logout: async () => {
        await apiFetch("/api/auth/logout", {
          method: "POST",
          token: get().accessToken,
          body: JSON.stringify({
            refreshToken: get().refreshToken,
          }),
        }).catch(() => undefined);
        set({ accessToken: null, refreshToken: null, user: null });
      },
      refresh: async () => {
        const rt = get().refreshToken;
        const data = await apiFetch<{
          user: ApiUser;
          accessToken: string;
          refreshToken: string;
        }>("/api/auth/refresh", {
          method: "POST",
          body: JSON.stringify({ refreshToken: rt }),
        });
        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
      },
    }),
    {
      name: "orbit-auth",
      partialize: (s) => ({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        user: s.user,
      }),
    },
  ),
);
