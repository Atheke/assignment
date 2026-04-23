"use client";

import { useParams, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { authedFetch } from "@/lib/authed-fetch";
import { useAuthStore } from "@/store/auth";

export default function WinnerProofPage() {
  const params = useParams<{ claimId: string }>();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [proofUrl, setProofUrl] = useState("https://example.com/proof.png");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!accessToken) {
    router.replace("/login");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    try {
      await authedFetch(`/api/winners/${params.claimId}/proof`, {
        method: "POST",
        body: JSON.stringify({ proofUrl }),
      });
      setMsg("Proof submitted for review.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    }
  }

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-lg px-6 pb-24 pt-28">
        <h1 className="text-2xl font-semibold text-white">
          Winner verification
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Provide a publicly reachable URL to supporting documentation. Admins
          review before payment is released.
        </p>
        <form className="mt-8 space-y-4 glass-panel p-6" onSubmit={onSubmit}>
          <label className="block text-xs uppercase tracking-wide text-slate-400">
            Proof URL
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              required
              type="url"
            />
          </label>
          {err ? (
            <p className="text-sm text-rose-400">{err}</p>
          ) : null}
          {msg ? (
            <p className="text-sm text-emerald-400">{msg}</p>
          ) : null}
          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 py-2.5 text-sm font-semibold text-orbit-bg"
          >
            Submit proof
          </button>
        </form>
      </main>
    </div>
  );
}
