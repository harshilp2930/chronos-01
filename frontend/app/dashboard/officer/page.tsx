"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { NoisePatternCard, StatTile } from "@/components/ui/card-with-noise-patter";
import {
  Clock,
  CheckCircle2,
  Users,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Satellite,
  Activity,
  TrendingUp,
} from "lucide-react";

interface Mission {
  id: string;
  title: string;
  status: string;
  target_body: string;
  vehicle_class: string;
  created_by: string;
  created_at: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  planner_name?: string;
}

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
  monthly_volume: Array<{ month: string; count: number }>;
}

interface UserData {
  id: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function OfficerHome() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [missions,  setMissions]  = useState<Mission[]>([]);
  const [users,     setUsers]     = useState<UserData[]>([]);
  const [loading,   setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setAnalytics(null);
    try {
      const [anaRes, mRes, uRes] = await Promise.all([
        api.get("/api/analytics/officer"),
        api.get("/api/missions/?limit=100"),
        api.get("/api/users/?limit=100"),
      ]);
      setAnalytics(anaRes.data);
      const userMap: Record<string, string> = {};
      (uRes.data as UserData[]).forEach((u) => (userMap[u.id] = u.full_name));
      const enriched = (mRes.data.missions as Mission[]).map((m) => ({
        ...m,
        planner_name: userMap[m.created_by] ?? "Unknown",
      }));
      setMissions(enriched);
      setUsers(uRes.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pending        = missions.filter((m) => m.status === "pending_approval");
  const activePlanners = users.filter((u) => u.role === "planner" && u.is_active);
  const today          = new Date().toISOString().slice(0, 10);
  const approvedToday  = missions.filter(
    (m) => m.status === "approved" && m.reviewed_at?.startsWith(today)
  ).length;

  const activity = missions
    .filter((m) => m.submitted_at || m.reviewed_at)
    .sort((a, b) => {
      const ta = new Date(a.reviewed_at ?? a.submitted_at ?? 0).getTime();
      const tb = new Date(b.reviewed_at ?? b.submitted_at ?? 0).getTime();
      return tb - ta;
    })
    .slice(0, 8);

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold" style={{ color: "#F0F4FF" }}>Officer Overview</h1>
          <p className="text-[13px] mt-1 font-['JetBrains_Mono',monospace]" style={{ color: "rgba(240,244,255,0.4)" }}>
            ◈ &nbsp;System-wide mission authority dashboard
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 h-10 rounded-lg text-sm transition-all duration-150"
          style={{
            color: "rgba(240,244,255,0.6)",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "transparent",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#F0F4FF")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(240,244,255,0.6)")}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile icon={Satellite}    label="Total Missions"  value={analytics?.total_missions ?? 0}  accent="#00E5FF" loading={loading} />
        <StatTile icon={Clock}        label="Pending Review"  value={pending.length}                   accent="#F59E0B" loading={loading} />
        <StatTile icon={CheckCircle2} label="Approved Today"  value={approvedToday}                    accent="#00C896" loading={loading} />
        <StatTile icon={Users}        label="Active Planners" value={activePlanners.length}             accent="#0066FF" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Pending queue */}
        <NoisePatternCard className="lg:col-span-2">
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: "#F59E0B" }} />
              <p className="section-label">Pending Review Queue</p>
              {pending.length > 0 && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-['JetBrains_Mono',monospace]"
                  style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}
                >
                  {pending.length}
                </span>
              )}
            </div>
            <Link
              href="/dashboard/officer/missions?status=pending_approval"
              className="flex items-center gap-1 text-xs transition-colors hover:underline"
              style={{ color: "#00E5FF" }}
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-[52px] rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
              ))}
            </div>
          ) : pending.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2" style={{ color: "#00C896" }} />
              <p className="text-sm" style={{ color: "rgba(240,244,255,0.4)" }}>All missions reviewed — queue clear</p>
            </div>
          ) : (
            <div>
              {pending.slice(0, 6).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-4 px-6 transition-colors duration-150 cursor-pointer"
                  style={{ height: "52px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,229,255,0.04)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  onClick={() => router.push(`/dashboard/officer/missions/${m.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold truncate" style={{ color: "#F0F4FF" }}>{m.title}</p>
                    <p className="text-[12px] mt-0.5 font-['JetBrains_Mono',monospace] truncate" style={{ color: "rgba(240,244,255,0.4)" }}>
                      {m.planner_name} · {m.target_body.toUpperCase()} · {m.vehicle_class.toUpperCase()}
                    </p>
                  </div>
                  <span className="text-xs shrink-0 font-['JetBrains_Mono',monospace]" style={{ color: "rgba(240,244,255,0.3)" }}>
                    {m.submitted_at ? timeAgo(m.submitted_at) : "—"}
                  </span>
                  <button
                    className="shrink-0 px-3 h-7 rounded-lg text-xs font-semibold transition-all duration-150"
                    style={{ background: "#00E5FF", color: "#080E1A" }}
                    onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/officer/missions/${m.id}`); }}
                  >
                    Review
                  </button>
                </div>
              ))}
            </div>
          )}
        </NoisePatternCard>

        {/* Activity feed */}
        <NoisePatternCard>
          <div
            className="flex items-center gap-2 px-6 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <Activity className="w-4 h-4" style={{ color: "#00E5FF" }} />
            <p className="section-label">Recent Activity</p>
          </div>

          {loading ? (
            <div className="p-6 text-center text-sm" style={{ color: "rgba(240,244,255,0.3)" }}>Loading…</div>
          ) : activity.length === 0 ? (
            <div className="p-6 text-center text-sm" style={{ color: "rgba(240,244,255,0.3)" }}>No activity yet</div>
          ) : (
            <div>
              {activity.map((m) => {
                const isReviewed = !!m.reviewed_at;
                const ts = m.reviewed_at ?? m.submitted_at ?? "";
                const dotColor = m.status === "approved" ? "#00C896" : m.status === "rejected" ? "#FF3B5C" : "#F59E0B";
                return (
                  <div
                    key={m.id + ts}
                    className="px-6 py-3"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: dotColor }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: "#F0F4FF" }}>{m.title}</p>
                        <p className="text-[11px] mt-0.5 font-['JetBrains_Mono',monospace]" style={{ color: "rgba(240,244,255,0.35)" }}>
                          {isReviewed ? (m.status === "approved" ? "Approved" : "Rejected") : "Submitted"} · {timeAgo(ts)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </NoisePatternCard>
      </div>

      {/* Planner performance table */}
      {!loading && analytics && analytics.planner_performance.length > 0 && (
        <NoisePatternCard>
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: "#00E5FF" }} />
              <p className="section-label">Planner Performance</p>
            </div>
            <Link
              href="/dashboard/officer/analytics"
              className="flex items-center gap-1 text-xs transition-colors hover:underline"
              style={{ color: "#00E5FF" }}
            >
              Full analytics <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Planner", "Submitted", "Approved", "Rejected", "Rate"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.08em]"
                      style={{ color: "rgba(240,244,255,0.35)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analytics.planner_performance.slice(0, 5).map((p) => (
                  <tr
                    key={p.planner_id}
                    className="transition-colors duration-150"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,229,255,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="px-6 h-[52px] text-[14px] font-semibold" style={{ color: "#F0F4FF" }}>{p.planner_name}</td>
                    <td className="px-6 h-[52px] font-['JetBrains_Mono',monospace] text-[13px]" style={{ color: "rgba(240,244,255,0.6)" }}>{p.submitted}</td>
                    <td className="px-6 h-[52px] font-['JetBrains_Mono',monospace] text-[13px]" style={{ color: "#00C896" }}>{p.approved}</td>
                    <td className="px-6 h-[52px] font-['JetBrains_Mono',monospace] text-[13px]" style={{ color: "#FF3B5C" }}>{p.rejected}</td>
                    <td className="px-6 h-[52px]">
                      <span
                        className="font-['JetBrains_Mono',monospace] text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: p.approval_rate >= 70 ? "rgba(0,200,150,0.15)" : p.approval_rate >= 40 ? "rgba(245,158,11,0.15)" : "rgba(255,59,92,0.15)",
                          color: p.approval_rate >= 70 ? "#00C896" : p.approval_rate >= 40 ? "#F59E0B" : "#FF3B5C",
                        }}
                      >
                        {p.approval_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </NoisePatternCard>
      )}
    </div>
  );
}
