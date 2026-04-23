"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/auth";

export function SiteHeader() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-orbit-bg/70 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-400/10 text-sm text-cyan-200">
            O
          </span>
          <span>Orbit</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
          <Link className="hover:text-white" href="/pricing">
            Plans
          </Link>
          <Link className="hover:text-white" href="/charities">
            Partners
          </Link>
          {user ? (
            <>
              <Link className="hover:text-white" href="/dashboard">
                Dashboard
              </Link>
              {user.role === "ADMIN" ? (
                <Link className="hover:text-white" href="/admin">
                  Admin
                </Link>
              ) : null}
              <button
                type="button"
                className="rounded-full border border-white/15 px-4 py-1 text-white hover:border-cyan-400/60"
                onClick={() => void logout()}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link className="hover:text-white" href="/login">
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-gradient-to-r from-cyan-500 to-sky-600 px-4 py-2 font-medium text-orbit-bg shadow-[0_0_24px_rgba(34,211,238,0.35)]"
              >
                Launch
              </Link>
            </>
          )}
        </nav>
      </div>
    </motion.header>
  );
}
