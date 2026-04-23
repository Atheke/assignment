"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

type Charity = {
  id: string;
  name: string;
  description: string | null;
  contributionPercent: number;
};

export default function CharitiesPage() {
  const [rows, setRows] = useState<Charity[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<{ charities: Charity[] }>("/api/charities")
      .then((r) => setRows(r.charities))
      .catch(() => setErr("Unable to load partners"));
  }, []);

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-28">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Partners
          </p>
          <h1 className="mt-4 text-4xl font-semibold text-white">
            Charities on the flight path
          </h1>
          <p className="mt-4 text-slate-400">
            Choose a partner when you launch. Directed share scales with plan
            gross — basis points shown for transparency.
          </p>
        </div>

        {err ? (
          <p className="mt-8 text-sm text-rose-400">{err}</p>
        ) : (
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {rows.map((c, idx) => (
              <motion.article
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="glass-panel p-6"
              >
                <h2 className="text-lg font-semibold text-white">{c.name}</h2>
                <p className="mt-2 text-xs uppercase tracking-wide text-cyan-200">
                  {c.contributionPercent.toFixed(2)}% directed share
                </p>
                {c.description ? (
                  <p className="mt-3 text-sm text-slate-400">{c.description}</p>
                ) : null}
              </motion.article>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/signup"
            className="inline-flex rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 px-6 py-3 text-sm font-semibold text-orbit-bg"
          >
            Align with a partner
          </Link>
        </div>
      </main>
    </div>
  );
}
