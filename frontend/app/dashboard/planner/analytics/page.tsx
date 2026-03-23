"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  ResponsiveContainer,
  type PieLabelRenderProps,
} from "recharts";
import { motion } from "framer-motion";
import { Loader2, TrendingUp, Rocket, Zap, AlertTriangle, Clock } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { PremiumCard, StatTile } from "@/components/ui/card-with-noise-pattern";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  total_missions: number;
  by_status:  Record<string, number>;
  by_target:  Record<string, number>;
  by_vehicle: Record<string, number>;
  avg_delta_v:      number | null;
  avg_scrub_risk:   number | null;
  delta_v_over_time: { date: string; delta_v: number }[];
  avg_approval_days: number | null;
}

// ── Colours ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  draft:            "rgba(240,244,255,0.25)",
  pending_approval: "#F59E0B",
  approved:         "#00C896",
  rejected:         "#FF3B5C",
};

const PALETTE = ["#00E5FF", "#0066FF", "#F59E0B", "#00C896", "#FF3B5C", "#8B5CF6"];

// ── Tooltip styles ────────────────────────────────────────────────────────────

const TOOLTIP_STYLE = {
  contentStyle: { background: "rgba(15, 20, 30, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#F0F4FF", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace" },
  itemStyle: { color: "rgba(240,244,255,0.6)", fontFamily: "'JetBrains Mono', monospace" },
  labelStyle: { color: "#F0F4FF", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" },
  cursor: { fill: "rgba(0,229,255,0.04)" }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildHistogram(
  missions: { scrub_risk_score: string | null }[],
  bins = 5,
): { range: string; count: number }[] {
  const values = missions
    .map((m) => (m.scrub_risk_score ? parseFloat(m.scrub_risk_score) : null))
    .filter((v): v is number => v !== null);

  const result: { range: string; count: number }[] = [];
  for (let i = 0; i < bins; i++) {
    const lo = i / bins;
    const hi = (i + 1) / bins;
    result.push({
      range: `${Math.round(lo * 100)}–${Math.round(hi * 100)}%`,
      count: values.filter((v) => v >= lo && v < hi).length,
    });
  }
  return result;
}

// ── Custom donut label ────────────────────────────────────────────────────────

const renderCustomLabel = (props: PieLabelRenderProps) => {
  const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, value } = props;
  if (!value) return null;
  const RAD = Math.PI / 180;
  const r   = (Number(innerRadius) + Number(outerRadius)) * 0.5;
  const x   = Number(cx) + r * Math.cos(-Number(midAngle) * RAD);
  const y   = Number(cy) + r * Math.sin(-Number(midAngle) * RAD);
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {value}
    </text>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { user }  = useAuthStore();
  const router    = useRouter();

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [missions,  setMissions]  = useState<{ scrub_risk_score: string | null }[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!user) { router.push("/auth/login"); return; }
    Promise.all([
      api.get("/api/analytics/planner"),
      api.get("/api/missions/", { params: { limit: 200 } }),
    ])
      .then(([{ data: a }, { data: m }]) => {
        setAnalytics(a);
        setMissions(m.missions ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#00E5FF" }} />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-20" style={{ color: "rgba(240,244,255,0.3)" }}>
        Could not load analytics data.
      </div>
    );
  }

  // Prepare data for charts
  const byStatusData = Object.entries(analytics.by_status).map(([name, value]) => ({
    name: name.replace("_", " "),
    value,
    fill: STATUS_COLORS[name] ?? "#64748b",
  }));

  const byTargetData = Object.entries(analytics.by_target).map(([name, value], i) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    missions: value,
    fill: PALETTE[i % PALETTE.length],
  }));

  const deltaVData = [...analytics.delta_v_over_time]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(({ date, delta_v }) => ({
      date,
      "ΔV (km/s)": Math.round(delta_v * 1000) / 1000,
    }));

  const histData = buildHistogram(missions);

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-[28px] font-bold" style={{ color: "#F0F4FF" }}>Mission Analytics</h1>
        <p className="text-[13px] mt-1 font-['JetBrains_Mono',monospace]" style={{ color: "rgba(240,244,255,0.4)" }}>
          Overview of your mission planning activity.
        </p>
      </motion.div>

      {/* ── Summary KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Rocket,        label: "Total Missions",    value: analytics.total_missions,                                     suffix: "",      accent: "#00E5FF" },
          { icon: Zap,           label: "Avg \u0394V",            value: analytics.avg_delta_v != null ? `${analytics.avg_delta_v.toFixed(2)} km/s` : "\u2014",    suffix: "",      accent: "#0066FF" },
          { icon: AlertTriangle, label: "Avg Scrub Risk",    value: analytics.avg_scrub_risk != null ? `${Math.round(analytics.avg_scrub_risk * 100)}%` : "\u2014", suffix: "",      accent: "#F59E0B" },
          { icon: Clock,         label: "Avg Approval Time", value: analytics.avg_approval_days != null ? `${analytics.avg_approval_days.toFixed(1)}d` : "\u2014",  suffix: "",      accent: "#00C896" },
        ].map((tile, i) => (
          <motion.div key={tile.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <StatTile icon={tile.icon} label={tile.label} value={tile.value} accent={tile.accent} />
          </motion.div>
        ))}
      </div>

      {/* ── Chart row 1: Donut + Bar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Donut — missions by status */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <PremiumCard>
              <div className="p-6 pb-0">
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(240,244,255,0.5)" }}>Missions by Status</h3>
              </div>
              <div className="px-6 pb-6 pt-2">
              {byStatusData.length === 0 || byStatusData.every((d) => d.value === 0) ? (
                <div className="h-[220px] flex items-center justify-center text-slate-600 text-sm">
                  No data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart margin={{ top: 16, bottom: 16 }}>
                    <Pie
                      data={byStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      labelLine={false}
                      label={renderCustomLabel}
                      stroke="none"
                    >
                      {byStatusData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} stroke="#080E1A" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      {...TOOLTIP_STYLE}
                      formatter={(v) => [`${v ?? 0} missions`, "status"]}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "rgba(240,244,255,0.4)" }}
                      formatter={(value) =>
                        value.charAt(0).toUpperCase() + value.slice(1)
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
              </div>
          </PremiumCard>
        </motion.div>

        {/* Bar — missions by target body */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <PremiumCard>
              <div className="p-6 pb-0">
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(240,244,255,0.5)" }}>Missions by Target Body</h3>
              </div>
              <div className="px-6 pb-6 pt-2">
              {byTargetData.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-slate-600 text-sm">
                  No data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={byTargetData} barSize={36} barCategoryGap="20%" margin={{ top: 24, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "rgba(240,244,255,0.45)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "rgba(240,244,255,0.45)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      {...TOOLTIP_STYLE}
                      cursor={{ fill: "rgba(255,255,255,0.02)" }}
                      formatter={(v) => [`${v ?? 0} missions`, "Missions"]}
                    />
                    <Bar dataKey="missions" radius={[4, 4, 0, 0]}>
                      {byTargetData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              </div>
          </PremiumCard>
        </motion.div>
      </div>

      {/* —— Chart row 2: Line + Histogram —— */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Line — delta-V over time */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
        >
          <PremiumCard>
              <div className="p-6 pb-0">
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] flex items-center gap-2" style={{ color: "rgba(240,244,255,0.5)" }}>
                  <TrendingUp className="w-4 h-4" style={{ color: "#0066FF" }} />
                  Delta-V over Time
                </h3>
              </div>
              <div className="px-6 pb-6 pt-2">
              {deltaVData.length < 2 ? (
                <div className="h-[220px] flex items-center justify-center text-slate-600 text-sm">
                  Need at least 2 missions with ΔV data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={deltaVData} margin={{ top: 24, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "rgba(240,244,255,0.45)", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "rgba(240,244,255,0.45)", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
                      axisLine={false}
                      tickLine={false}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip {...TOOLTIP_STYLE} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1, strokeDasharray: "4 4" }} />
                    <Line
                      type="monotone"
                      dataKey="ΔV (km/s)"
                      stroke="#0066FF"
                      strokeWidth={2.5}
                      dot={{ fill: "#0066FF", r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: "#00E5FF", strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
              </div>
          </PremiumCard>
        </motion.div>

        {/* Bar — scrub risk histogram */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.48 }}
        >
          <PremiumCard>
              <div className="p-6 pb-0">
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(240,244,255,0.5)" }}>Scrub Risk Distribution</h3>
              </div>
              <div className="px-6 pb-6 pt-2">
              {histData.every((b) => b.count === 0) ? (
                <div className="h-[220px] flex items-center justify-center text-slate-600 text-sm">
                  No scrub risk data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={histData} barSize={42} barCategoryGap="20%" margin={{ top: 24, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis
                      dataKey="range"
                      tick={{ fill: "rgba(240,244,255,0.45)", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "rgba(240,244,255,0.45)", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      {...TOOLTIP_STYLE}
                      cursor={{ fill: "rgba(255,255,255,0.02)" }}
                      formatter={(v) => [`${v ?? 0} missions`, "Count"]}
                    />
                    <Bar dataKey="count" fill="#00E5FF" radius={[4, 4, 0, 0]} opacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              </div>
          </PremiumCard>
        </motion.div>
      </div>
    </div>
  );
}
