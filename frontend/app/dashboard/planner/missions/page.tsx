"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Rocket,
  AlertCircle,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { PremiumCard } from "@/components/ui/card-with-noise-pattern";
import { StatusBadge } from "@/components/planner/status-badge";

interface Mission {
  id: string;
  title: string;
  status: string;
  target_body: string;
  vehicle_class: string;
  launch_pad_id: string;
  launch_date: string | null;
  delta_v_km_s: string | null;
  scrub_risk_score: string | null;
  officer_notes: string | null;
  created_at: string;
}

const STATUSES = [
  { value: "",                 label: "All Statuses" },
  { value: "draft",            label: "Draft"        },
  { value: "pending_approval", label: "Pending"      },
  { value: "approved",         label: "Approved"     },
  { value: "rejected",         label: "Rejected"     },
];

const TARGETS = [
  { value: "",      label: "All Targets" },
  { value: "moon",  label: "Moon"        },
  { value: "mars",  label: "Mars"        },
  { value: "venus", label: "Venus"       },
];

const selectStyle: React.CSSProperties = {
  height: "42px",
  padding: "0 14px",
  borderRadius: "8px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#F0F4FF",
  fontSize: "14px",
  outline: "none",
};

export default function MissionsPage() {
  const [missions,      setMissions]      = useState<Mission[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [statusFilter,  setStatusFilter]  = useState("");
  const [targetFilter,  setTargetFilter]  = useState("");
  const [search,        setSearch]        = useState("");

  useEffect(() => {
    const params: Record<string, string> = { limit: "100" };
    if (statusFilter) params.status = statusFilter;
    if (targetFilter) params.target = targetFilter;
    api
      .get("/api/missions/", { params })
      .then(({ data }) => setMissions(data.missions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [statusFilter, targetFilter]);

  const filtered = missions.filter(
    (m) => !search || m.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-8">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-[28px] font-bold" style={{ color: "#F0F4FF" }}>Mission History</h1>
          <p className="text-[13px] mt-1 font-['JetBrains_Mono',monospace]" style={{ color: "rgba(240,244,255,0.4)" }}>
            {loading ? "Loading\u2026" : `${filtered.length} mission${filtered.length !== 1 ? "s" : ""}`}
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

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-3"
      >
        <div className="relative flex-1 min-w-50">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "rgba(240,244,255,0.3)" }} />
          <input
            type="text"
            placeholder="Search missions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 transition-all duration-150 focus:outline-none"
            style={{
              ...selectStyle,
              paddingLeft: "40px",
              color: "#F0F4FF",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#00E5FF"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,229,255,0.12)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setLoading(true);
            setStatusFilter(e.target.value);
          }}
          style={selectStyle}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value} style={{ background: "#131F2E" }}>{s.label}</option>
          ))}
        </select>
        <select
          value={targetFilter}
          onChange={(e) => {
            setLoading(true);
            setTargetFilter(e.target.value);
          }}
          style={selectStyle}
        >
          {TARGETS.map((t) => (
            <option key={t.value} value={t.value} style={{ background: "#131F2E" }}>{t.label}</option>
          ))}
        </select>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <PremiumCard>
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-13 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Rocket className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(240,244,255,0.1)" }} />
              <p className="text-sm" style={{ color: "rgba(240,244,255,0.4)" }}>No missions found.</p>
              {!search && !statusFilter && !targetFilter && (
                <Link href="/dashboard/planner/missions/new" className="text-sm underline mt-1 block" style={{ color: "#00E5FF" }}>
                  Create your first mission →
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap" style={{ color: "rgba(240,244,255,0.35)" }}>Mission</th>
                    <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap hidden sm:table-cell" style={{ color: "rgba(240,244,255,0.35)" }}>Target</th>
                    <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap hidden md:table-cell" style={{ color: "rgba(240,244,255,0.35)" }}>Pad</th>
                    <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap hidden md:table-cell" style={{ color: "rgba(240,244,255,0.35)" }}>Vehicle</th>
                    <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap hidden lg:table-cell" style={{ color: "rgba(240,244,255,0.35)" }}>Launch Date</th>
                    <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap hidden lg:table-cell" style={{ color: "rgba(240,244,255,0.35)" }}>ΔV km/s</th>
                    <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap" style={{ color: "rgba(240,244,255,0.35)" }}>Status</th>
                    <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap" style={{ color: "rgba(240,244,255,0.35)" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m, i) => (
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
                      <td className="px-6 py-3 align-middle">
                        <div className="font-semibold text-[14px] truncate max-w-50" style={{ color: "#F0F4FF" }}>
                          {m.title}
                        </div>
                        {m.status === "rejected" && m.officer_notes && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <AlertCircle className="w-3 h-3 shrink-0" style={{ color: "#FF3B5C" }} />
                            <span
                              className="text-[11px] font-['JetBrains_Mono',monospace] truncate max-w-45"
                              style={{ color: "rgba(255,59,92,0.8)" }}
                              title={m.officer_notes}
                            >
                              {m.officer_notes}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3 align-middle hidden sm:table-cell font-['JetBrains_Mono',monospace] text-[13px] capitalize" style={{ color: "rgba(240,244,255,0.6)" }}>
                        {m.target_body}
                      </td>
                      <td className="px-6 py-3 align-middle hidden md:table-cell font-['JetBrains_Mono',monospace] text-[13px] uppercase" style={{ color: "rgba(240,244,255,0.6)" }}>
                        {m.launch_pad_id}
                      </td>
                      <td className="px-6 py-3 align-middle hidden md:table-cell font-['JetBrains_Mono',monospace] text-[13px] uppercase" style={{ color: "rgba(240,244,255,0.6)" }}>
                        {m.vehicle_class}
                      </td>
                      <td className="px-6 py-3 align-middle hidden lg:table-cell font-['JetBrains_Mono',monospace] text-[13px]" style={{ color: "rgba(240,244,255,0.6)" }}>
                        {m.launch_date ?? "\u2014"}
                      </td>
                      <td className="px-6 py-3 align-middle hidden lg:table-cell font-['JetBrains_Mono',monospace] text-[13px]" style={{ color: "rgba(240,244,255,0.6)" }}>
                        {m.delta_v_km_s ? Number(m.delta_v_km_s).toFixed(2) : "\u2014"}
                      </td>
                      <td className="px-6 py-3 align-middle">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="px-6 py-3 align-middle">
                        <Link
                          href={`/dashboard/planner/missions/${m.id}`}
                          className="inline-flex items-center gap-1 px-3 h-8 rounded-lg text-[12px] font-semibold transition-all duration-150 opacity-0 group-hover:opacity-100"
                          style={{ color: "#00E5FF", border: "1px solid rgba(0,229,255,0.25)" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,229,255,0.08)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          View <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PremiumCard>
      </motion.div>
    </div>
  );
}

