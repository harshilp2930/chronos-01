"use client";

import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Rocket,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { StatusBadge } from "@/components/planner/status-badge";
import { NoisePatternCard, StatTile } from "@/components/ui/card-with-noise-pattern";

interface Mission {
  id: string;
  title: string;
  status: string;
  target_body: string;
  vehicle_class: string;
  launch_pad_id: string;
  launch_date: string | null;
  delta_v_km_s: number | null;
  officer_notes: string | null;
  created_at: string;
}

const STAT_CARDS = [
  { key: "total",    label: "Total Missions",   icon: Rocket,       accent: "#00E5FF" },
  { key: "pending",  label: "Pending Approval", icon: Clock,        accent: "#F59E0B" },
  { key: "approved", label: "Approved",         icon: CheckCircle2, accent: "#00C896" },
  { key: "rejected", label: "Rejected",         icon: XCircle,      accent: "#FF3B5C" },
] as const;

export default function PlannerDashboard() {
  const { user } = useAuthStore();
  const router   = useRouter();

  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!user) { router.push("/auth/login"); return; }
    api
      .get("/api/missions/", { params: { limit: 50 } })
      .then(({ data }) => setMissions(data.missions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, router]);

  const stats = {
    total:    missions.length,
    pending:  missions.filter((m) => m.status === "pending_approval").length,
    approved: missions.filter((m) => m.status === "approved").length,
    rejected: missions.filter((m) => m.status === "rejected").length,
  };

  const recent = [...missions]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);
  return (
    <div className="space-y-8">
      {/* ── Page header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-[28px] font-bold leading-tight" style={{ color: "#F0F4FF" }}>
            <span
              className="inline-block w-2 h-2 rounded-full mr-3 mb-0.5 align-middle"
              style={{ background: "#00E5FF", boxShadow: "0 0 8px rgba(0,229,255,0.6)" }}
            />
            Mission Control
          </h1>
          <p className="mt-1 text-[13px] font-['JetBrains_Mono',monospace]" style={{ color: "rgba(240,244,255,0.4)" }}>
            ◈ &nbsp;Mission control ready. All systems nominal.
          </p>
        </div>
        <Link href="/dashboard/planner/missions/new">
          <button
            className="flex items-center gap-2 px-5 h-10 rounded-lg font-semibold text-sm transition-all duration-150 glow-pulse"
            style={{ background: "#00E5FF", color: "#080E1A" }}
          >
            <Plus className="w-4 h-4" />
            New Mission
          </button>
        </Link>
      </motion.div>
      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card, i) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <StatTile
              icon={card.icon}
              label={card.label}
              value={stats[card.key]}
              accent={card.accent}
              loading={loading}
            />
          </motion.div>
        ))}
      </div>
      {/* ── Recent missions ── */}
      <div className="grid grid-cols-1 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36 }}
        >
          <NoisePatternCard>
            {/* Card header */}
            <div
              className="flex items-center justify-between px-6 py-2"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p className="section-label">Recent Missions</p>
              <Link
                href="/dashboard/planner/missions"
                className="text-xs transition-colors hover:underline"
                style={{ color: "#00E5FF" }}
              >
                View all ›
              </Link>
            </div>
            {loading ? (
              <div className="p-4 space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-[52px] rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className="py-8 text-center">
                <Rocket className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(240,244,255,0.1)" }} />
                <p className="text-sm" style={{ color: "rgba(240,244,255,0.4)" }}>No missions yet.</p>
                <Link href="/dashboard/planner/missions/new" className="text-sm underline mt-0 block" style={{ color: "#00E5FF" }}>
                  Create your first mission
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      {[
                        "Mission",
                        "Target",
                        "Vehicle",
                        "Launch Date",
                        "Status",
                        "",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left px-6 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap align-middle"
                          style={{ color: "rgba(240,244,255,0.35)" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((m, i) => (
                      <tr
                        key={m.id}
                        className="group row-animate transition-colors duration-150"
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          animationDelay: `${i * 30}ms`,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,229,255,0.04)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td className="px-6 h-[52px] font-semibold text-[14px] truncate max-w-[160px]" style={{ color: "#F0F4FF" }}>
                          {m.title}
                        </td>
                        <td className="px-6 h-[52px] hidden sm:table-cell font-['JetBrains_Mono',monospace] text-[13px] capitalize" style={{ color: "rgba(240,244,255,0.6)" }}>
                          {m.target_body}
                        </td>
                        <td className="px-6 h-[52px] hidden md:table-cell font-['JetBrains_Mono',monospace] text-[13px] uppercase" style={{ color: "rgba(240,244,255,0.6)" }}>
                          {m.vehicle_class}
                        </td>
                        <td className="px-6 h-[52px] hidden md:table-cell font-['JetBrains_Mono',monospace] text-[13px]" style={{ color: "rgba(240,244,255,0.6)" }}>
                          {m.launch_date ?? "—"}
                        </td>
                        <td className="px-6 h-[52px]">
                          <StatusBadge status={m.status} />
                        </td>
                        <td className="px-6 h-[52px]">
                          <Link href={`/dashboard/planner/missions/${m.id}`} className="text-xs underline" style={{ color: "#00E5FF" }}>
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </NoisePatternCard>
        </motion.div>
      </div>
    </div>
  );
}
