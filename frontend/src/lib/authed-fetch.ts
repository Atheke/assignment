"use client";

import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export async function authedFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const { accessToken, refresh } = useAuthStore.getState();
  const run = async (tok: string | null) =>
    apiFetch<T>(path, { ...init, token: tok });
  try {
    return await run(accessToken);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (
      msg.includes("Unauthorized") ||
      msg.includes("401") ||
      msg === "Unauthorized"
    ) {
      await refresh();
      const tok = useAuthStore.getState().accessToken;
      return await run(tok);
    }
    throw e;
  }
}
