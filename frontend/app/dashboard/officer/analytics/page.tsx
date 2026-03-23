"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import { RefreshCw, TrendingUp, BarChart3, PieChart as PieIcon, Activity, Rocket, CheckCircle, XCircle } from "lucide-react";
import { PremiumCard, StatTile } from "@/components/ui/card-with-noise-pattern";

interface AnalyticsData {
  total_missions: number;
  approved: number;
  rejected: number;
  pending: number;
  approval_rate_pct: number;
  planner_performance: Array<{
    planner_id: string;
    planner_name: string;
    submitted: number;
    approved: number;
    rejected: number;
    approval_rate: number;
  }>;
  by_vehicle_success: Record<string, { approved: number; rejected: number; total: number }>;
  by_target_success: Record<string, { approved: number; rejected: number; total: number }>;
  monthly_volume: Array<{ month: string; count: number }>;
}

const APPROVE_COLOR = "#00C896";
const REJECT_COLOR  = "#FF3B5C";
const PENDING_COLOR = "#F59E0B";
const DRAFT_COLOR   = "rgba(240,244,255,0.2)";

const TOOLTIP_STYLE = {
  contentStyle: { background: "rgba(15, 20, 30, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#F0F4FF", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace" },
  itemStyle: { color: "rgba(240,244,255,0.6)", fontFamily: "'JetBrains Mono', monospace" },
  labelStyle: { color: "#F0F4FF", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" },
  cursor: { fill: "rgba(0,229,255,0.04)" }
};

function ChartCard({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; children: React.ReactNode }) {
  return (
    <PremiumCard>
        <div className="rounded-xl p-6 overflow-hidden">
          <div className="flex items-center gap-2 mb-6">
            <Icon className="w-4 h-4" style={{ color: "#00E5FF" } as React.CSSProperties} />
            <h3 className="text-[12px] font-bold uppercase tracking-[0.15em]" style={{ color: "rgba(240,244,255,0.7)" }}>{title}</h3>
          </div>
          {children}
        </div>
    </PremiumCard>
  );
}

const renderDonutLabel = ({ name, percent }: PieLabelRenderProps) =>
  percent !== undefined && percent > 0.08
    ? `${(percent * 100).toFixed(0)}%`
    : null;

export default function OfficerAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading,   setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<AnalyticsData>("/api/analytics/officer");
      setAnalytics(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#00E5FF" }} />
      </div>
    );
  }

  if (!analytics) {
    return <div className="text-center py-24" style={{ color: "rgba(240,244,255,0.3)" }}>No analytics data.</div>;
  }

  // ── Data prep ────────────────────────────────────────────────────────────
  const donutData = [
    { name: "Approved", value: analytics.approved,  fill: APPROVE_COLOR },
    { name: "Rejected", value: analytics.rejected,  fill: REJECT_COLOR  },
    { name: "Pending",  value: analytics.pending,   fill: PENDING_COLOR },
    { name: "Draft",    value: analytics.total_missions - analytics.approved - analytics.rejected - analytics.pending, fill: DRAFT_COLOR },
  ].filter((d) => d.value > 0);

  const vehicleData = Object.entries(analytics.by_vehicle_success).map(([name, v]) => ({
    name: name.toUpperCase(),
    Approved: v.approved,
    Rejected: v.rejected,
    Pending:  v.total - v.approved - v.rejected,
  }));

  const targetData = Object.entries(analytics.by_target_success).map(([name, v]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    Approved: v.approved,
    Rejected: v.rejected,
    Pending:  v.total - v.approved - v.rejected,
  }));

  const monthlyData = analytics.monthly_volume.map((d) => ({ ...d, month: d.month.slice(0, 7) }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold" style={{ color: "#F0F4FF" }}>Officer Analytics</h1>
          <p className="text-[13px] mt-1 font-['JetBrains_Mono',monospace]" style={{ color: "rgba(240,244,255,0.4)" }}>System-wide performance overview</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-4 h-10 rounded-lg text-sm transition-all duration-150"
          style={{ color: "rgba(240,244,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#F0F4FF")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(240,244,255,0.6)")}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile icon={Rocket}       label="Total Missions" value={analytics.total_missions}       accent="#00E5FF" />
        <StatTile icon={CheckCircle}  label="Approved"       value={analytics.approved}             accent="#00C896" />
        <StatTile icon={XCircle}      label="Rejected"       value={analytics.rejected}             accent="#FF3B5C" />
        <StatTile icon={TrendingUp}   label="Approval Rate"  value={`${analytics.approval_rate_pct}%`} accent="#0066FF" />
      </div>

      {/* Row 1: Donut + planner performance table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Approval Breakdown" icon={PieIcon}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart margin={{ top: 24, bottom: 24 }}>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={58} outerRadius={84}
                dataKey="value" label={renderDonutLabel} labelLine={false} stroke="none">
                {donutData.map((d, i) => (
                  <Cell key={i} fill={d.fill} stroke="#080E1A" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v: number | undefined, name: string | undefined) => [v != null ? `${v} missions` : "", name || ""]}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "rgba(240,244,255,0.4)", paddingTop: "8px" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Planner Performance" icon={TrendingUp}>
          <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0" style={{ background: "rgba(15,25,35,0.9)", backdropFilter: "blur(8px)" }}>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <th className="text-left pb-3 pr-4 text-[10px] uppercase tracking-widest font-bold" style={{ color: "rgba(240,244,255,0.4)" }}>Planner</th>
                  <th className="text-right pb-3 pr-4 text-[10px] uppercase tracking-widest font-bold" style={{ color: "rgba(240,244,255,0.4)" }}>Sub.</th>
                  <th className="text-right pb-3 pr-4 text-[10px] uppercase tracking-widest font-bold" style={{ color: "rgba(240,244,255,0.4)" }}>Appr.</th>
                  <th className="text-right pb-3 pr-4 text-[10px] uppercase tracking-widest font-bold" style={{ color: "rgba(240,244,255,0.4)" }}>Rej.</th>
                  <th className="text-right pb-3 text-[10px] uppercase tracking-widest font-bold" style={{ color: "rgba(240,244,255,0.4)" }}>Rate</th>
                </tr>
              </thead>
              <tbody>
                {analytics.planner_performance.length === 0 ? (
                  <tr><td colSpan={5} className="py-6 text-center text-sm" style={{ color: "rgba(240,244,255,0.3)" }}>No data</td></tr>
                ) : (
                  analytics.planner_performance.map((p) => (
                    <tr key={p.planner_id} className="transition-all duration-200" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <td className="py-3.5 pr-4 text-[13px] font-bold truncate max-w-[120px]" style={{ color: "#F0F4FF" }}>{p.planner_name}</td>
                      <td className="py-3.5 pr-4 text-right text-[13px] font-['JetBrains_Mono',monospace]" style={{ color: "rgba(240,244,255,0.6)" }}>{p.submitted}</td>
                      <td className="py-3.5 pr-4 text-right text-[13px] font-['JetBrains_Mono',monospace]" style={{ color: "#00C896" }}>{p.approved}</td>
                      <td className="py-3.5 pr-4 text-right text-[13px] font-['JetBrains_Mono',monospace]" style={{ color: "#FF3B5C" }}>{p.rejected}</td>
                      <td className="py-3.5 text-right">
                        <span className="font-['JetBrains_Mono',monospace] text-[11px] px-2 py-0.5 rounded-[999px] font-bold inline-block min-w-[36px] text-center" style={{
                          background: p.approval_rate >= 70 ? "rgba(0,200,150,0.12)" : p.approval_rate >= 40 ? "rgba(245,158,11,0.12)" : "rgba(255,59,92,0.12)",
                          color: p.approval_rate >= 70 ? "#00C896" : p.approval_rate >= 40 ? "#F59E0B" : "#FF3B5C",
                        }}>
                          {p.approval_rate}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      {/* Row 2: Vehicle + Target grouped bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Success Rate by Vehicle Class" icon={BarChart3}>
          {vehicleData.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-sm" style={{ color: "rgba(240,244,255,0.3)" }}>No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={vehicleData} barCategoryGap="20%" margin={{ top: 24, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "rgba(240,244,255,0.45)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(240,244,255,0.45)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "rgba(240,244,255,0.4)" }} />
                <Bar dataKey="Approved" fill={APPROVE_COLOR} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Rejected" fill={REJECT_COLOR}  radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pending"  fill={PENDING_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Success Rate by Target Body" icon={BarChart3}>
          {targetData.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-sm" style={{ color: "rgba(240,244,255,0.3)" }}>No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={targetData} barCategoryGap="20%" margin={{ top: 24, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "rgba(240,244,255,0.45)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(240,244,255,0.45)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "rgba(240,244,255,0.4)" }} />
                <Bar dataKey="Approved" fill={APPROVE_COLOR} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Rejected" fill={REJECT_COLOR}  radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pending"  fill={PENDING_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Row 3: Monthly volume area chart */}
      <ChartCard title="Monthly Mission Volume" icon={Activity}>
        {monthlyData.length === 0 ? (
          <div className="h-[240px] flex items-center justify-center text-sm" style={{ color: "rgba(240,244,255,0.3)" }}>No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlyData} margin={{ top: 24, right: 16 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00E5FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00E5FF" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "rgba(240,244,255,0.45)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(240,244,255,0.45)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Area type="monotone" dataKey="count" stroke="#00E5FF" strokeWidth={2.5} fill="url(#areaGrad)" name="Missions" activeDot={{ r: 6, fill: "#00E5FF", strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
