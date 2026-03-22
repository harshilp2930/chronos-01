"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { StatusBadge } from "@/components/planner/status-badge";
import { NoisePatternCard } from "@/components/ui/card-with-noise-patter";
import {
  Search,
  Filter,
  Eye,
  RefreshCw,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

interface Mission {
  id: string;
  title: string;
  status: string;
  target_body: string;
  vehicle_class: string;
  orbit_type: string | null;
  launch_date: string | null;
  created_by: string;
  created_at: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  planner_name?: string;
}

interface UserData {
  id: string;
  full_name: string;
  role: string;
}

type SortKey = "title" | "status" | "target_body" | "planner_name" | "submitted_at" | "created_at";

function MissionsContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [missions,   setMissions]   = useState<Mission[]>([]);
  const [users,      setUsers]      = useState<UserData[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [statusF,    setStatusF]    = useState(searchParams.get("status") ?? "");
  const [targetF,    setTargetF]    = useState("");
  const [plannerF,   setPlannerF]   = useState("");
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");
  const [sortKey,    setSortKey]    = useState<SortKey>("submitted_at");
  const [sortAsc,    setSortAsc]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, uRes] = await Promise.all([
        api.get("/api/missions/?limit=500"),
        api.get("/api/users/?limit=200"),
      ]);
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

  // Filtering
  const filtered = missions.filter((m) => {
    if (search && !m.title.toLowerCase().includes(search.toLowerCase()) &&
        !(m.planner_name ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    if (statusF  && m.status      !== statusF)   return false;
    if (targetF  && m.target_body !== targetF)   return false;
    if (plannerF && m.created_by  !== plannerF)  return false;
    if (dateFrom && m.created_at < dateFrom)      return false;
    if (dateTo   && m.created_at > dateTo + "T23:59:59") return false;
    return true;
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      sortAsc ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />
    ) : null;

  const planners = users.filter((u) => u.role === "planner" || u.role === "individual");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold" style={{ color: "#F0F4FF" }}>Mission Review</h1>
          <p className="text-[13px] mt-1 font-['JetBrains_Mono',monospace]" style={{ color: "rgba(240,244,255,0.4)" }}>All missions across all planners</p>
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

      {/* Filters */}
      <div
        className="rounded-xl p-4 flex flex-wrap gap-3"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "rgba(240,244,255,0.3)" }} />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or planner…"
            className="w-full focus:outline-none transition-all"
            style={{
              height: "42px", paddingLeft: "38px", paddingRight: "14px", borderRadius: "8px",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#F0F4FF", fontSize: "14px",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#00E5FF"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,229,255,0.12)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
          />
        </div>
        {[{
          value: statusF, onChange: setStatusF,
          options: [["All Statuses", ""], ["Draft", "draft"], ["Pending", "pending_approval"], ["Approved", "approved"], ["Rejected", "rejected"]],
        }, {
          value: targetF, onChange: setTargetF,
          options: [["All Targets", ""], ["Moon", "moon"], ["Mars", "mars"], ["Venus", "venus"]],
        }, {
          value: plannerF, onChange: setPlannerF,
          options: [["All Planners", ""], ...planners.map((u) => [u.full_name, u.id] as [string,string])],
        }].map((sel, idx) => (
          <select
            key={idx}
            value={sel.value}
            onChange={(e) => sel.onChange(e.target.value)}
            style={{
              height: "42px", padding: "0 14px", borderRadius: "8px",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#F0F4FF", fontSize: "14px", outline: "none",
            }}
          >
            {sel.options.map(([label, val]) => (
              <option key={val} value={val} style={{ background: "#131F2E" }}>{label}</option>
            ))}
          </select>
        ))}
        {[{ val: dateFrom, set: setDateFrom }, { val: dateTo, set: setDateTo }].map((d, i) => (
          <input
            key={i}
            type="date"
            value={d.val}
            onChange={(e) => d.set(e.target.value)}
            style={{
              height: "42px", padding: "0 14px", borderRadius: "8px",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#F0F4FF", fontSize: "14px", outline: "none",
            }}
          />
        ))}
        {(search || statusF || targetF || plannerF || dateFrom || dateTo) && (
          <button
            onClick={() => { setSearch(""); setStatusF(""); setTargetF(""); setPlannerF(""); setDateFrom(""); setDateTo(""); }}
            className="flex items-center gap-1 px-3 h-[42px] rounded-lg text-xs transition-colors"
            style={{ color: "rgba(240,244,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#F0F4FF")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(240,244,255,0.5)")}
          >
            <Filter className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Count */}
      <p className="text-[13px] font-['JetBrains_Mono',monospace]" style={{ color: "rgba(240,244,255,0.35)" }}>
        {sorted.length} mission{sorted.length !== 1 ? "s" : ""}
      </p>

      {/* Table */}
      <NoisePatternCard>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {([
                  ["title",        "Mission"],
                  ["planner_name", "Planner"],
                  ["status",       "Status"],
                  ["target_body",  "Target"],
                  ["submitted_at", "Submitted"],
                  ["created_at",   "Created"],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <th key={key}
                    onClick={() => toggleSort(key)}
                    className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] cursor-pointer select-none whitespace-nowrap transition-colors"
                    style={{ color: sortKey === key ? "#F0F4FF" : "rgba(240,244,255,0.35)" }}
                  >
                    {label} <SortIcon col={key} />
                  </th>
                ))}
                <th
                  className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: "rgba(240,244,255,0.35)" }}
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-sm" style={{ color: "rgba(240,244,255,0.3)" }}>Loading…</td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-sm" style={{ color: "rgba(240,244,255,0.3)" }}>No missions found</td></tr>
              ) : (
                sorted.map((m) => (
                  <tr
                    key={m.id}
                    className="transition-colors duration-150"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,229,255,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="px-6 h-[52px]">
                      <p className="text-[14px] font-semibold max-w-[200px] truncate" style={{ color: "#F0F4FF" }}>{m.title}</p>
                      <p className="text-xs font-['JetBrains_Mono',monospace]" style={{ color: "rgba(240,244,255,0.35)" }}>
                        {m.vehicle_class?.toUpperCase()} · {m.orbit_type?.toUpperCase() ?? "—"}
                      </p>
                    </td>
                    <td className="px-6 h-[52px] text-[14px]" style={{ color: "rgba(240,244,255,0.6)" }}>{m.planner_name}</td>
                    <td className="px-6 h-[52px]"><StatusBadge status={m.status} /></td>
                    <td className="px-6 h-[52px] font-['JetBrains_Mono',monospace] text-[13px] capitalize" style={{ color: "rgba(240,244,255,0.6)" }}>{m.target_body}</td>
                    <td className="px-6 h-[52px] font-['JetBrains_Mono',monospace] text-[13px] whitespace-nowrap" style={{ color: "rgba(240,244,255,0.6)" }}>
                      {m.submitted_at ? new Date(m.submitted_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 h-[52px] font-['JetBrains_Mono',monospace] text-[13px] whitespace-nowrap" style={{ color: "rgba(240,244,255,0.6)" }}>
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 h-[52px]">
                      <button
                        onClick={() => router.push(`/dashboard/officer/missions/${m.id}`)}
                        className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold transition-all duration-150"
                        style={{
                          background: m.status === "pending_approval" ? "#00E5FF" : "transparent",
                          color: m.status === "pending_approval" ? "#080E1A" : "#00E5FF",
                          border: m.status === "pending_approval" ? "none" : "1px solid rgba(0,229,255,0.3)",
                        }}
                      >
                        <Eye className="w-3 h-3" />
                        {m.status === "pending_approval" ? "Review" : "View"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </NoisePatternCard>
    </div>
  );
}

export default function OfficerMissionsPage() {
  return (
    <Suspense fallback={<div className="text-slate-500 py-20 text-center">Loading…</div>}>
      <MissionsContent />
    </Suspense>
  );
}
