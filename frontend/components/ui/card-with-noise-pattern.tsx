import * as React from "react";
import { Card } from "./card";


interface StatTileProps {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  value: number | string;
  accent?: string;
  loading?: boolean;
}

export function StatTile({ icon: Icon, label, value, accent = "#00E5FF", loading }: StatTileProps) {
  return (
    <PremiumCard className="flex flex-row items-center px-5 py-4 gap-4 transition-transform hover:-translate-y-1 hover:shadow-lg duration-300">
      <div className="flex items-center justify-center w-12 h-12 rounded-[14px] shrink-0 border" style={{ background: accent + "0A", borderColor: accent + "20" }}>
        <Icon size={24} color={accent} strokeWidth={1.5} />
      </div>
      <div className="flex flex-col">
        <span className="text-3xl font-bold leading-none tracking-tight" style={{ color: "#F0F4FF" }}>
          {loading ? <span className="animate-pulse text-xl opacity-50">—</span> : value}
        </span>
        <span className="text-[11px] font-semibold tracking-[0.08em] mt-1.5 uppercase" style={{ color: accent }}>{label}</span>
      </div>
    </PremiumCard>
  );
}

export function PremiumCard({ className = "", ...props }: React.ComponentProps<"div">) {
  return (
    <div 
      className={`relative overflow-hidden rounded-2xl bg-white/[0.02] backdrop-blur-md transition-colors hover:bg-white/[0.04] ${className}`}
      style={{
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.05), 0 4px 24px -8px rgba(0,0,0,0.5)",
      }}
      {...props} 
    />
  );
}
