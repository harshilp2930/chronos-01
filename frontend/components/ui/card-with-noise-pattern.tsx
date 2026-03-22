import * as React from "react";
import { Card } from "./card";


interface StatTileProps {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  value: number | string;
  accent?: string;
  loading?: boolean;
}

export function StatTile({ icon: Icon, label, value, accent = "#00E5FF", loading }: StatTileProps) {
  return (
    <div
      className="flex flex-row items-center w-full bg-card border border-border rounded-2xl shadow-sm px-4 py-3"
      style={{ minHeight: 80 }}
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-full mr-3" style={{ background: accent + "22" }}>
        <Icon size={24} color={accent} />
      </div>
      <div className="flex flex-col flex-1">
        <span className="text-xl font-normal leading-tight" style={{ color: accent }}>
          {loading ? <span className="animate-pulse">...</span> : value}
        </span>
        <span className="text-xs font-medium text-muted-foreground tracking-wide mt-0 uppercase">{label}</span>
      </div>
    </div>
  );
}

export function NoisePatternCard({ className = "", ...props }: React.ComponentProps<"div">) {
  return (
    <Card className={`bg-[url('/noise.png')] bg-cover bg-blend-overlay ${className}`} {...props} />
  );
}
