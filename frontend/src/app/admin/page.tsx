"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { authedFetch } from "@/lib/authed-fetch";
import { useAuthStore } from "@/store/auth";

type Analytics = {
  users: number;
  activeSubscriptions: number;
  completedDraws: number;
  pendingWinnerReviews: number;
};

export default function AdminPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [pending, setPending] = useState<
    {
      id: string;
      proofUrl: string | null;
      prizeCents: number;
      user: { email: string };
      draw: { year: number; month: number };
    }[]
  >([]);
  const [year, setYear] = useState(new Date().getUTCFullYear());
  const [month, setMonth] = useState(new Date().getUTCMonth() + 1);
  const [mode, setMode] = useState<"RANDOM" | "ALGORITHMIC">("RANDOM");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    if (user && user.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [accessToken, router, user]);

  async function load() {
    try {
      const [a, w] = await Promise.all([
        authedFetch<Analytics>("/api/admin/analytics"),
        authedFetch<{ claims: typeof pending }>("/api/admin/winners/pending"),
      ]);
      setAnalytics(a);
      setPending(w.claims);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Admin load failed");
    }
  }

  useEffect(() => {
    if (user?.role === "ADMIN") void load();
  }, [user]);

  async function runDraw(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    try {
      const res = await authedFetch<{
        winningNumbers: number[];
        winnerCount: number;
      }>("/api/admin/draws/run", {
        method: "POST",
        body: JSON.stringify({ year, month, mode }),
      });
      setMsg(
        `Draw executed. Winning numbers ${JSON.stringify(res.winningNumbers)} — ${res.winnerCount} winners.`,
      );
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Draw failed");
    }
  }

  async function decide(
    id: string,
    paymentStatus: "APPROVED" | "REJECTED" | "PAID",
  ) {
    setErr(null);
    try {
      await authedFetch(`/api/admin/winners/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ paymentStatus }),
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    }
  }

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-28">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Mission control
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              Admin surface
            </h1>
          </div>
        </div>

        {err ? (
          <p className="mt-6 text-sm text-rose-400" role="alert">
            {err}
          </p>
        ) : null}
        {msg ? (
          <p className="mt-6 text-sm text-emerald-400" role="status">
            {msg}
          </p>
        ) : null}

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {analytics
            ? (
              [
                ["Users", analytics.users],
                ["Active subs", analytics.activeSubscriptions],
                ["Draws run", analytics.completedDraws],
                ["Pending reviews", analytics.pendingWinnerReviews],
              ] as const
            ).map(([label, value]) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-4"
              >
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {label}
                </p>
                <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
              </motion.div>
            ))
            : null}
        </section>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-6"
          >
            <h2 className="text-lg font-semibold text-white">Execute draw</h2>
            <p className="mt-2 text-xs text-slate-500">
              Random uses cryptographic sampling. Algorithmic mode derives a
              deterministic line from operator telemetry seeds for auditability.
            </p>
            <form className="mt-4 grid gap-3" onSubmit={runDraw}>
              <label className="text-xs text-slate-400">
                Year
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2 text-sm"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                />
              </label>
              <label className="text-xs text-slate-400">
                Month
                <input
                  type="number"
                  min={1}
                  max={12}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2 text-sm"
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                />
              </label>
              <label className="text-xs text-slate-400">
                Mode
                <select
                  className="mt-1 w-full rounded-lg border border-white/10 bg-orbit-bg px-2 py-2 text-sm"
                  value={mode}
                  onChange={(e) =>
                    setMode(e.target.value as "RANDOM" | "ALGORITHMIC")
                  }
                >
                  <option value="RANDOM">Random</option>
                  <option value="ALGORITHMIC">Algorithmic</option>
                </select>
              </label>
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 py-2.5 text-sm font-semibold text-white"
              >
                Run draw
              </button>
            </form>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-panel p-6"
          >
            <h2 className="text-lg font-semibold text-white">
              Winner verification queue
            </h2>
            <div className="mt-4 space-y-3">
              {pending.length ? (
                pending.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="text-slate-300">{c.user.email}</span>
                      <span className="text-xs text-slate-500">
                        {c.draw.year}-{String(c.draw.month).padStart(2, "0")}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {(c.prizeCents / 100).toFixed(2)} USD ·{" "}
                      <a
                        href={c.proofUrl ?? "#"}
                        className="text-cyan-300 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Proof
                      </a>
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-emerald-500/20 px-3 py-1 text-xs text-emerald-200"
                        onClick={() => void decide(c.id, "APPROVED")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-rose-500/20 px-3 py-1 text-xs text-rose-200"
                        onClick={() => void decide(c.id, "REJECTED")}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-cyan-500/20 px-3 py-1 text-xs text-cyan-200"
                        onClick={() => void decide(c.id, "PAID")}
                      >
                        Mark paid
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No proofs awaiting.</p>
              )}
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
}
