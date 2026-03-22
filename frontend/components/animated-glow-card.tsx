"use client";

import { cn } from "@/lib/utils";

// ── Plus corner icons ─────────────────────────────────────────────────────────

const PlusIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    width={20}
    height={20}
    strokeWidth="1"
    stroke="currentColor"
    className={cn("text-cyan-500/60 size-5 shrink-0", className)}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
  </svg>
);

const CornerPlusIcons = () => (
  <>
    <PlusIcon className="absolute -top-2.5 -left-2.5" />
    <PlusIcon className="absolute -top-2.5 -right-2.5" />
    <PlusIcon className="absolute -bottom-2.5 -left-2.5" />
    <PlusIcon className="absolute -bottom-2.5 -right-2.5" />
  </>
);

// ── CardCanvas ────────────────────────────────────────────────────────────────
// Outer wrapper — provides relative positioning context for corner icons

interface CardCanvasProps {
  children: React.ReactNode;
  className?: string;
}

export function CardCanvas({ children, className }: CardCanvasProps) {
  return (
    <div className={cn("relative", className)}>
      {children}
    </div>
  );
}

// ── GlowCard ──────────────────────────────────────────────────────────────────
// Card surface with dashed border + corner plus icons

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  noPad?: boolean;
}

export function GlowCard({ children, className, noPad }: GlowCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-none border border-dashed border-zinc-700/80 bg-white/[0.02]",
        !noPad && "p-0",
        className,
      )}
    >
      <CornerPlusIcons />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
