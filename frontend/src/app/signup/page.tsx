"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { apiFetch } from "@/lib/api";
import type { ApiUser } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

type Charity = {
  id: string;
  name: string;
  contributionPercent: number;
};

export default function SignupPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [charities, setCharities] = useState<Charity[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [charityId, setCharityId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void apiFetch<{ charities: Charity[] }>("/api/charities")
      .then((r) => {
        setCharities(r.charities);
        if (r.charities[0]) setCharityId(r.charities[0].id);
      })
      .catch(() => setError("Could not load charities"));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{
        user: ApiUser;
        accessToken: string;
        refreshToken: string;
      }>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password, charityId }),
      });
      setSession(data.accessToken, data.refreshToken, data.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
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
          <h1 className="text-2xl font-semibold text-white">Create account</h1>
          <p className="mt-2 text-sm text-slate-400">
            Pick your impact partner and enter the mission stack.
          </p>
          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-400">
                Name
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none ring-cyan-400/40 focus:ring-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
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
                Password (min 10 chars)
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none ring-cyan-400/40 focus:ring-2"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={10}
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-400">
                Charity partner
              </label>
              <select
                className="mt-2 w-full rounded-xl border border-white/10 bg-orbit-bg px-3 py-2 text-sm outline-none ring-cyan-400/40 focus:ring-2"
                value={charityId}
                onChange={(e) => setCharityId(e.target.value)}
                required
              >
                {charities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.contributionPercent}% directed
                  </option>
                ))}
              </select>
            </div>
            {error ? (
              <p className="text-sm text-rose-400" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loading || !charityId}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 py-2.5 text-sm font-semibold text-orbit-bg disabled:opacity-60"
            >
              {loading ? "Creating…" : "Ignite account"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-400">
            Already flying?{" "}
            <Link className="text-cyan-300 hover:underline" href="/login">
              Sign in
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
