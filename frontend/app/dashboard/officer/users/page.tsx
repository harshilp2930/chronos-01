"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import {
  Search,
  UserPlus,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
} from "lucide-react";

interface UserData {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  mission_count?: number;
}

interface MissionData {
  created_by: string;
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { bg: string; color: string; border: string }> = {
    officer:    { bg: "rgba(0,102,255,0.12)", color: "#0066FF", border: "rgba(0,102,255,0.3)" },
    planner:    { bg: "rgba(0,229,255,0.10)", color: "#00E5FF", border: "rgba(0,229,255,0.25)" },
    individual: { bg: "rgba(0,200,150,0.10)", color: "#00C896", border: "rgba(0,200,150,0.25)" },
  };
  const s = map[role] ?? { bg: "rgba(255,255,255,0.06)", color: "rgba(240,244,255,0.5)", border: "rgba(255,255,255,0.1)" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-[999px] text-[11px] font-bold uppercase font-['JetBrains_Mono',monospace]"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, letterSpacing: "0.05em" }}
    >
      {role}
    </span>
  );
}

export default function OfficerUsersPage() {
  const [users,       setUsers]       = useState<UserData[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [roleF,       setRoleF]       = useState("");
  const [statusF,     setStatusF]     = useState("");
  const [actionId,    setActionId]    = useState<string | null>(null);
  const [error,       setError]       = useState("");
  const [success,     setSuccess]     = useState("");

  // Create planner modal
  const [createOpen,    setCreateOpen]    = useState(false);
  const [createName,    setCreateName]    = useState("");
  const [createEmail,   setCreateEmail]   = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError,   setCreateError]   = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [uRes, mRes] = await Promise.all([
        api.get("/api/users/?limit=200"),
        api.get("/api/missions/?limit=500&skip=0"),
      ]);
      const missionCountMap: Record<string, number> = {};
      (mRes.data.missions as MissionData[]).forEach((m) => {
        missionCountMap[m.created_by] = (missionCountMap[m.created_by] ?? 0) + 1;
      });
      const enriched = (uRes.data as UserData[]).map((u) => ({
        ...u,
        mission_count: missionCountMap[u.id] ?? 0,
      }));
      setUsers(enriched);
    } catch {
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggleActive = async (u: UserData) => {
    setActionId(u.id);
    setError(""); setSuccess("");
    try {
      const endpoint = u.is_active
        ? `/api/users/${u.id}/deactivate`
        : `/api/users/${u.id}/reactivate`;
      const { data } = await api.patch<UserData>(endpoint);
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, is_active: data.is_active } : x));
      setSuccess(`${u.full_name} ${data.is_active ? "reactivated" : "deactivated"}.`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Action failed.");
    } finally {
      setActionId(null);
    }
  };

  const handleCreate = async () => {
    if (!createName.trim() || !createEmail.trim() || !createPassword.trim()) {
      setCreateError("All fields are required."); return;
    }
    setCreateLoading(true); setCreateError("");
    try {
      const { data } = await api.post<UserData>("/api/users/", {
        full_name: createName,
        email:     createEmail,
        password:  createPassword,
      });
      setUsers((prev) => [{ ...data, mission_count: 0 }, ...prev]);
      setCreateOpen(false);
      setCreateName(""); setCreateEmail(""); setCreatePassword("");
      setSuccess(`Planner account created for ${data.full_name}.`);
      setTimeout(() => setSuccess(""), 4000);
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setCreateError(
        Array.isArray(detail)
          ? (detail as { msg?: string }[]).map((d) => d.msg ?? String(d)).join("; ")
          : typeof detail === "string" ? detail : "Creation failed."
      );
    } finally {
      setCreateLoading(false);
    }
  };

  const filtered = users.filter((u) => {
    if (search && !u.full_name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleF   && u.role !== roleF) return false;
    if (statusF === "active"   && !u.is_active)  return false;
    if (statusF === "inactive" &&  u.is_active)  return false;
    return true;
  });

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-bold" style={{ color: "#F0F4FF" }}>User Management</h1>
            <p className="text-[13px] mt-1 font-['JetBrains_Mono',monospace]" style={{ color: "rgba(240,244,255,0.4)" }}>
              {users.filter((u) => u.is_active).length} active · {users.length} total
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load}
              className="flex items-center gap-1.5 px-3 h-10 rounded-lg text-sm transition-all duration-150"
              style={{ color: "rgba(240,244,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#F0F4FF")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(240,244,255,0.5)")}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-4 h-10 rounded-lg text-sm font-semibold transition-all duration-150 glow-pulse"
              style={{ background: "#00E5FF", color: "#080E1A" }}
            >
              <UserPlus className="w-4 h-4" /> Create Planner
            </button>
          </div>
        </div>

        {/* Feedback */}
        {success && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm" style={{ background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.3)", color: "#00C896" }}>
            <CheckCircle2 className="w-4 h-4" /> {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm" style={{ background: "rgba(255,59,92,0.1)", border: "1px solid rgba(255,59,92,0.3)", color: "#FF3B5C" }}>
            <XCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "rgba(240,244,255,0.3)" }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email…"
              className="w-full focus:outline-none transition-all"
              style={{
                height: "42px", paddingLeft: "40px", paddingRight: "14px", borderRadius: "8px",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#F0F4FF", fontSize: "14px",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#00E5FF"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,229,255,0.12)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
            />
          </div>
          {[{
            value: roleF, onChange: setRoleF,
            options: [["All Roles", ""], ["Officer", "officer"], ["Planner", "planner"], ["Individual", "individual"]],
          }, {
            value: statusF, onChange: setStatusF,
            options: [["All Status", ""], ["Active", "active"], ["Inactive", "inactive"]],
          }].map((sel, idx) => (
            <select key={idx} value={sel.value} onChange={(e) => sel.onChange(e.target.value)}
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
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)", background: "#0F1923" }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Name", "Email", "Role", "Status", "Missions", "Joined", "Actions"].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap" style={{ color: "rgba(240,244,255,0.35)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-10 text-center text-sm" style={{ color: "rgba(240,244,255,0.3)" }}>Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-10 text-center text-sm" style={{ color: "rgba(240,244,255,0.3)" }}>No users found</td></tr>
                ) : (
                  filtered.map((u) => (
                    <tr key={u.id} className="transition-colors duration-150"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,229,255,0.04)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <td className="px-6 h-[52px]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: "rgba(0,229,255,0.1)", color: "#00E5FF", border: "1px solid rgba(0,229,255,0.2)" }}>
                            {u.full_name.charAt(0)}
                          </div>
                          <span className="font-semibold text-[14px]" style={{ color: "#F0F4FF" }}>{u.full_name}</span>
                        </div>
                      </td>
                      <td className="px-6 h-[52px] font-['JetBrains_Mono',monospace] text-[12px]" style={{ color: "rgba(240,244,255,0.5)" }}>{u.email}</td>
                      <td className="px-6 h-[52px]"><RoleBadge role={u.role} /></td>
                      <td className="px-6 h-[52px]">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[999px] text-[11px] font-semibold"
                          style={{
                            background: u.is_active ? "rgba(0,200,150,0.1)" : "rgba(255,255,255,0.05)",
                            color: u.is_active ? "#00C896" : "rgba(240,244,255,0.3)",
                            border: u.is_active ? "1px solid rgba(0,200,150,0.25)" : "1px solid rgba(255,255,255,0.08)",
                          }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: u.is_active ? "#00C896" : "rgba(240,244,255,0.2)" }} />
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 h-[52px] font-['JetBrains_Mono',monospace] text-[13px]" style={{ color: "rgba(240,244,255,0.6)" }}>{u.mission_count ?? 0}</td>
                      <td className="px-6 h-[52px] font-['JetBrains_Mono',monospace] text-[13px] whitespace-nowrap" style={{ color: "rgba(240,244,255,0.4)" }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 h-[52px]">
                        {u.role !== "officer" && (
                          <button
                            onClick={() => handleToggleActive(u)}
                            disabled={actionId === u.id}
                            className="px-3 h-8 rounded-lg text-xs font-semibold transition-all duration-150 disabled:opacity-50"
                            style={{
                              background: "transparent",
                              color: u.is_active ? "#FF3B5C" : "#00C896",
                              border: u.is_active ? "1px solid rgba(255,59,92,0.3)" : "1px solid rgba(0,200,150,0.3)",
                            }}
                          >
                            {actionId === u.id ? "…" : u.is_active ? "Deactivate" : "Reactivate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Create Planner Modal ── */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(8,14,26,0.8)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-md rounded-xl p-6 shadow-2xl space-y-5"
            style={{ background: "#0F1923", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" style={{ color: "#00E5FF" }} />
                <h2 className="text-base font-semibold" style={{ color: "#F0F4FF" }}>Create Planner Account</h2>
              </div>
              <button onClick={() => { setCreateOpen(false); setCreateError(""); }}
                className="transition-colors" style={{ color: "rgba(240,244,255,0.4)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#F0F4FF")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(240,244,255,0.4)")}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {[{ label: "Full Name", value: createName, onChange: setCreateName, type: "text" as const, placeholder: "Jane Smith" },
                { label: "Email", value: createEmail, onChange: setCreateEmail, type: "email" as const, placeholder: "jane@example.com" },
                { label: "Password", value: createPassword, onChange: setCreatePassword, type: "password" as const, placeholder: "Min 8 chars, 1 uppercase, 1 digit" },
              ].map((field) => (
                <div key={field.label}>
                  <label className="block text-[12px] font-medium mb-1.5" style={{ color: "rgba(240,244,255,0.5)" }}>{field.label}</label>
                  <input
                    type={field.type}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full focus:outline-none transition-all"
                    style={{
                      height: "42px", padding: "0 14px", borderRadius: "8px",
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                      color: "#F0F4FF", fontSize: "14px",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#00E5FF"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,229,255,0.12)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                </div>
              ))}
            </div>

            {createError && <p className="text-xs" style={{ color: "#FF3B5C" }}>{createError}</p>}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button onClick={() => { setCreateOpen(false); setCreateError(""); }}
                className="px-4 h-10 rounded-lg text-sm transition-all duration-150"
                style={{ color: "rgba(240,244,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#F0F4FF")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(240,244,255,0.5)")}>
                Cancel
              </button>
              <button onClick={handleCreate} disabled={createLoading}
                className="flex items-center gap-1.5 px-4 h-10 rounded-lg text-sm font-semibold transition-all duration-150 disabled:opacity-50"
                style={{ background: "#00E5FF", color: "#080E1A" }}>
                {createLoading ? "Creating…" : "Create Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
