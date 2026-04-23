export type ApiUser = {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
  charityId: string | null;
  charity: {
    id: string;
    name: string;
    basisPoints: number;
  } | null;
  subscription: {
    plan: string;
    status: string;
    currentPeriodEnd: string | null;
  } | null;
};

function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

export async function apiFetch<T>(
  path: string,
  opts: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const headers = new Headers(opts.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (opts.token) {
    headers.set("Authorization", `Bearer ${opts.token}`);
  }
  const res = await fetch(`${apiBase()}${path}`, {
    ...opts,
    headers,
    credentials: "include",
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export { apiBase };
