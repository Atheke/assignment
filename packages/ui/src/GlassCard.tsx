import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export function GlassCard({ children, className = "" }: Props) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_0_40px_rgba(56,189,248,0.08)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}
