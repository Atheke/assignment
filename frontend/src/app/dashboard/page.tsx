"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { apiFetch } from "@/lib/api";
import { authedFetch } from "@/lib/authed-fetch";
import { useAuthStore } from "@/store/auth";

type ScoreRow = { id: string; value: number; playedOn: string };

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const logout = useAuthStore((s) => s.logout);

  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [value, setValue] = useState(18);
  const [playedOn, setPlayedOn] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [draw, setDraw] = useState<{
    id: string;
    jackpotCents: number;
    executedAt: string | null;
  } | null>(null);
  const [pick, setPick] = useState<number[]>([3, 9, 18, 27, 36]);
  const [entry, setEntry] = useState<{ numbers: unknown } | null>(null);
  const [history, setHistory] = useState<{
    entries: unknown[];
    winnings: unknown[];
  } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const active = user?.subscription?.status === "ACTIVE";

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    void load();
  }, [accessToken, router]);

  async function load() {
    setErr(null);
    try {
      let scoreRows: ScoreRow[] = [];
      await authedFetch<{ scores: ScoreRow[] }>("/api/scores")
        .then((r) => {
          scoreRows = r.scores;
        })
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : "";
          if (
            msg.includes("subscription") ||
            msg.includes("402") ||
            msg.includes("Active subscription")
          ) {
            scoreRows = [];
          } else {
            throw e;
          }
        });

      const [cur, hist] = await Promise.all([
        apiFetch<{ draw: { id: string; jackpotCents: number; executedAt: string | null } }>(
          "/api/draws/current",
        ),
        authedFetch<{ entries: unknown[]; winnings: unknown[] }>(
          "/api/draws/history/me",
        ),
      ]);
      setScores(scoreRows);
      setDraw(cur.draw);
      setHistory(hist);
      const mine = await authedFetch<{ entry: { numbers: unknown } | null }>(
        `/api/draws/${cur.draw.id}/me`,
      ).catch(() => ({ entry: null }));
      setEntry(mine.entry);
      if (mine.entry?.numbers && Array.isArray(mine.entry.numbers)) {
        setPick(mine.entry.numbers.map((n) => Number(n)));
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load dashboard");
    }
  }

  async function submitScore(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await authedFetch<{ scores: ScoreRow[] }>("/api/scores", {
        method: "POST",
        body: JSON.stringify({ value, playedOn }),
      });
      setScores(res.scores);
      setMsg("Telemetry recorded.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Score rejected");
    }
  }

  async function submitNumbers(e: FormEvent) {
    e.preventDefault();
    if (!draw || draw.executedAt) return;
    setMsg(null);
    try {
      await authedFetch(`/api/draws/${draw.id}/entry`, {
        method: "POST",
        body: JSON.stringify({ numbers: pick }),
      });
      setMsg("Draw line locked in.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Entry failed");
    }
  }

  function updatePick(idx: number, n: number) {
    const next = [...pick];
    next[idx] = n;
    setPick(next);
  }

  const jackpotLabel = useMemo(() => {
    if (!draw) return "—";
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
    }).format(draw.jackpotCents / 100);
  }, [draw]);

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-28">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Mission console
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              Welcome back{user?.name ? `, ${user.name}` : ""}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-300 hover:border-cyan-400/50"
          >
            Sign out
          </button>
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

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-6"
          >
            <h2 className="text-lg font-semibold text-white">Subscription</h2>
            <p className="mt-2 text-sm text-slate-400">
              Status:{" "}
              <span className="text-white">
                {user?.subscription?.status ?? "—"}
              </span>
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Plan:{" "}
              <span className="text-white">
                {user?.subscription?.plan ?? "—"}
              </span>
            </p>
            <Link
              href="/pricing"
              className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 px-4 py-2 text-sm font-semibold text-orbit-bg"
            >
              {active ? "Manage billing" : "Activate subscription"}
            </Link>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-panel p-6"
          >
            <h2 className="text-lg font-semibold text-white">
              Charity routing
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {user?.charity?.name ?? "No partner selected"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Directed share uses your plan&apos;s gross — basis points{" "}
              {user?.charity?.basisPoints ?? "—"} ({((user?.charity?.basisPoints ?? 0) / 100).toFixed(2)}%).
            </p>
          </motion.section>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel p-6"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-white">
                Telemetry window
              </h2>
              <span className="text-xs uppercase tracking-wide text-slate-500">
                Last five dates
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Values between 1–45. Duplicate calendar dates replace the prior
              reading for that day.
            </p>
            <form className="mt-4 grid gap-3 sm:grid-cols-3" onSubmit={submitScore}>
              <label className="text-xs text-slate-400">
                Reading
                <input
                  type="number"
                  min={1}
                  max={45}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2 text-sm"
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  disabled={!active}
                />
              </label>
              <label className="text-xs text-slate-400 sm:col-span-2">
                Date
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2 text-sm"
                  value={playedOn}
                  onChange={(e) => setPlayedOn(e.target.value)}
                  disabled={!active}
                />
              </label>
              <button
                type="submit"
                disabled={!active}
                className="sm:col-span-3 rounded-xl bg-white/[0.06] px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.1] disabled:opacity-40"
              >
                Save reading
              </button>
            </form>
            <div className="mt-6 space-y-2">
              {scores.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm"
                >
                  <span className="text-slate-400">{s.playedOn}</span>
                  <span className="font-mono text-cyan-200">{s.value}</span>
                </div>
              ))}
              {!scores.length ? (
                <p className="text-xs text-slate-500">No telemetry yet.</p>
              ) : null}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-panel p-6"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-white">
                Monthly draw entry
              </h2>
              <span className="text-xs text-slate-400">{jackpotLabel} pool</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Pick five distinct integers from 1–45. Executions are handled by
              mission control with random or algorithmic modes.
            </p>
            <form className="mt-4 space-y-4" onSubmit={submitNumbers}>
              <div className="grid grid-cols-5 gap-2">
                {pick.map((n, idx) => (
                  <input
                    key={idx}
                    type="number"
                    min={1}
                    max={45}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2 text-center text-sm"
                    value={n}
                    onChange={(e) =>
                      updatePick(idx, Number(e.target.value))
                    }
                    disabled={!active || !!draw?.executedAt}
                  />
                ))}
              </div>
              <button
                type="submit"
                disabled={!active || !!draw?.executedAt}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 py-2.5 text-sm font-semibold text-orbit-bg disabled:opacity-40"
              >
                {draw?.executedAt ? "Draw complete" : "Confirm line"}
              </button>
            </form>
            {entry ? (
              <p className="mt-3 text-xs text-slate-500">
                Saved entry:{" "}
                <span className="font-mono text-slate-300">
                  {JSON.stringify(entry.numbers)}
                </span>
              </p>
            ) : null}
          </motion.section>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 glass-panel p-6"
        >
          <h2 className="text-lg font-semibold text-white">
            Participation & winnings
          </h2>
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Recent entries
              </p>
              <ul className="mt-2 space-y-2 text-sm text-slate-300">
                {history?.entries?.length ? (
                  (history.entries as { year: number; month: number }[]).map(
                    (e, i) => (
                      <li key={i} className="rounded-lg bg-white/[0.02] px-3 py-2">
                        {e.year}-{String(e.month).padStart(2, "0")}
                      </li>
                    ),
                  )
                ) : (
                  <li className="text-slate-500">No entries yet.</li>
                )}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Winnings & verification
              </p>
              <ul className="mt-2 space-y-2 text-sm">
                {history?.winnings?.length ? (
                  (
                    history.winnings as {
                      id: string;
                      matchCount: number;
                      prizeCents: number;
                      paymentStatus: string;
                    }[]
                  ).map((w) => (
                    <li
                      key={w.id}
                      className="flex flex-col rounded-lg bg-white/[0.02] px-3 py-2"
                    >
                      <span className="text-slate-300">
                        Match {w.matchCount} ·{" "}
                        {(w.prizeCents / 100).toFixed(2)} USD
                      </span>
                      <span className="text-xs text-slate-500">
                        {w.paymentStatus}
                      </span>
                      <Link
                        href={`/dashboard/winner/${w.id}`}
                        className="mt-2 text-xs text-cyan-300 hover:underline"
                      >
                        Upload verification proof
                      </Link>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-500">No payouts yet.</li>
                )}
              </ul>
            </div>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
