"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { apiFetch } from "@/lib/api";
import { authedFetch } from "@/lib/authed-fetch";
import { useAuthStore } from "@/store/auth";

export default function PricingPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [loading, setLoading] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("checkout") === "success") {
      setNotice("Checkout completed — subscription will activate shortly.");
    }
  }, []);

  async function checkout(plan: "MONTHLY" | "YEARLY") {
    if (!accessToken) {
      router.push("/login");
      return;
    }
    setLoading(plan);
    try {
      const origin = window.location.origin;
      const data = await authedFetch<{ url: string | null }>(
        "/api/stripe/checkout",
        {
          method: "POST",
          body: JSON.stringify({
            plan,
            successUrl: `${origin}/pricing?checkout=success`,
            cancelUrl: `${origin}/pricing`,
          }),
        },
      );
      if (data.url) window.location.href = data.url;
      else setNotice("Billing unavailable — configure Stripe keys.");
    } catch {
      setNotice("Unable to start checkout.");
    } finally {
      setLoading(null);
    }
  }

  useEffect(() => {
    void apiFetch<{ publishableKey: string }>("/api/stripe/config").catch(
      () => undefined,
    );
  }, []);

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Pricing
          </p>
          <h1 className="mt-4 text-4xl font-semibold text-white">
            Pick your velocity tier
          </h1>
          <p className="mt-4 text-slate-400">
            Unlock telemetry capture, monthly draw entry, and charity routing.
            Stripe test mode ready for staging missions.
          </p>
        </div>

        {notice ? (
          <p className="mx-auto mt-8 max-w-xl text-center text-sm text-emerald-400">
            {notice}
          </p>
        ) : null}

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {[
            {
              id: "MONTHLY" as const,
              title: "Monthly mission",
              price: "$29 / mo",
              detail: "Flexible cadence for active operators.",
            },
            {
              id: "YEARLY" as const,
              title: "Annual trajectory",
              price: "$290 / yr",
              detail: "Best value — two months included.",
            },
          ].map((plan, idx) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="glass-panel flex flex-col p-8"
            >
              <h2 className="text-xl font-semibold text-white">{plan.title}</h2>
              <p className="mt-4 text-3xl font-semibold text-cyan-200">
                {plan.price}
              </p>
              <p className="mt-3 text-sm text-slate-400">{plan.detail}</p>
              <ul className="mt-6 space-y-2 text-sm text-slate-300">
                <li>• Rolling five-slot telemetry capture</li>
                <li>• Monthly draw participation</li>
                <li>• Charity allocation visibility</li>
              </ul>
              <button
                type="button"
                disabled={!!loading}
                onClick={() => void checkout(plan.id)}
                className="mt-8 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 px-4 py-3 text-sm font-semibold text-orbit-bg disabled:opacity-50"
              >
                {loading === plan.id ? "Redirecting…" : "Choose plan"}
              </button>
              {user?.subscription?.status === "ACTIVE" ? (
                <p className="mt-4 text-xs text-slate-500">
                  Current status: ACTIVE ({user.subscription.plan})
                </p>
              ) : null}
            </motion.div>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-slate-500">
          Need to review partners first?{" "}
          <Link href="/charities" className="text-cyan-300 hover:underline">
            Explore charities
          </Link>
        </p>
      </main>
    </div>
  );
}
