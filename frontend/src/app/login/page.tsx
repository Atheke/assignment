"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { apiFetch } from "@/lib/api";
import type { ApiUser } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

function getHomeRoute(user: ApiUser): string {
  return user.role === "ADMIN" ? "/admin" : "/dashboard";
}

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accessToken || !user) return;
    router.replace(getHomeRoute(user));
  }, [accessToken, router, user]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{
        user: ApiUser;
        accessToken: string;
        refreshToken: string;
      }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSession(data.accessToken, data.refreshToken, data.user);
      router.push(getHomeRoute(data.user));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 pb-24 pt-28">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-8"
        >
          <h1 className="text-2xl font-semibold text-white">Sign in</h1>
          <p className="mt-2 text-sm text-slate-400">
            Access your mission console.
          </p>
          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-400">
                Email
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none ring-cyan-400/40 focus:ring-2"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-400">
                Password
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none ring-cyan-400/40 focus:ring-2"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error ? (
              <p className="text-sm text-rose-400" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 py-2.5 text-sm font-semibold text-orbit-bg disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Enter console"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-400">
            No account?{" "}
            <Link className="text-cyan-300 hover:underline" href="/signup">
              Create one
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
