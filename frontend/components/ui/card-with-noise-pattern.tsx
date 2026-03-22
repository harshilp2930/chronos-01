"use client";

import { cn } from "@/lib/utils";

// ── NoisePatternCard ──────────────────────────────────────────────────────────
// CHRONOS-1 surface card: solid #0F1923, subtle border, 12px radius, hover lift.

interface NoisePatternCardProps {
  children: React.ReactNode;
  className?: string;
  /** Pass an accent color hex (e.g. "#00E5FF") to render a top accent border */
  accent?: string;
  hover?: boolean;
}

export function NoisePatternCard({
  children,
  className,
  hover = false,
}: NoisePatternCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl",
        "bg-[#0F1923]/50",
        "border border-[rgba(255,255,255,0.06)]",
        "shadow-[0_2px_16px_rgba(0,0,0,0.35)]",
        hover && "cursor-pointer transition-colors duration-200 hover:bg-[#162030]/60",
        className,
      )}

    >
      {children}
    </div>
  );
}

// ── NoisePatternCardBody ──────────────────────────────────────────────────────

interface NoisePatternCardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function NoisePatternCardBody({ children, className }: NoisePatternCardBodyProps) {
  return (
    <div className={cn("p-5 md:p-6", className)}>
      {children}
    </div>
  );
}

// ── StatTile ──────────────────────────────────────────────────────────────────
// Stat card per design spec: icon TL, value TR, label BL, accent top border.

interface StatTileProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  accent: string;   // hex color
  loading?: boolean;
}

export function StatTile({ icon: Icon, label, value, accent, loading }: StatTileProps) {
  return (
    <NoisePatternCard hover>
      <div className="p-5 flex items-center gap-4">
        <div
          className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: `${accent}18`, color: accent }}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-1" style={{ color: "rgba(240,244,255,0.4)" }}>{label}</p>
          <span
            className="font-['JetBrains_Mono',monospace] text-[28px] font-bold leading-none"
            style={{ color: "#F0F4FF" }}
          >
            {loading ? "—" : value}
          </span>
        </div>
      </div>
    </NoisePatternCard>
  );
}
