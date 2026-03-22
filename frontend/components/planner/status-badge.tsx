"use client";

// Status badge — pill shape per CHRONOS-1 design system spec
const STATUS_MAP: Record<string, { label: string; style: React.CSSProperties }> = {
  draft: {
    label: "DRAFT",
    style: {
      background: "rgba(240,244,255,0.06)",
      border: "1px solid rgba(240,244,255,0.15)",
      color: "rgba(240,244,255,0.4)",
    },
  },
  pending_approval: {
    label: "● PENDING",
    style: {
      background: "rgba(245,158,11,0.15)",
      border: "1px solid #F59E0B",
      color: "#F59E0B",
    },
  },
  approved: {
    label: "APPROVED",
    style: {
      background: "rgba(0,200,150,0.15)",
      border: "1px solid #00C896",
      color: "#00C896",
    },
  },
  rejected: {
    label: "REJECTED",
    style: {
      background: "rgba(255,59,92,0.15)",
      border: "1px solid #FF3B5C",
      color: "#FF3B5C",
    },
  },
};

export function StatusBadge({ status }: { status: string; pulse?: boolean }) {
  const config = STATUS_MAP[status] ?? {
    label: status.replace(/_/g, " ").toUpperCase(),
    style: {
      background: "rgba(240,244,255,0.06)",
      border: "1px solid rgba(240,244,255,0.15)",
      color: "rgba(240,244,255,0.4)",
    },
  };
  return (
    <span
      style={config.style}
      className="inline-flex items-center px-[10px] py-[3px] rounded-[999px] text-[11px] font-bold uppercase tracking-[0.05em] font-['JetBrains_Mono',monospace] whitespace-nowrap"
    >
      {config.label}
    </span>
  );
}
