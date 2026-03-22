"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/auth";
import api from "@/lib/api";
import {
  ShieldCheck,
  KeyRound,
  Users,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface UserData {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function OfficerProfilePage() {
  const { user } = useAuthStore();

  const [planners,     setPlanners]     = useState<UserData[]>([]);
  const [loading,      setLoading]      = useState(true);

  // Password form
  const [currentPw,   setCurrentPw]    = useState("");
  const [newPw,       setNewPw]        = useState("");
  const [confirmPw,   setConfirmPw]    = useState("");
  const [showPw,      setShowPw]       = useState(false);
  const [pwLoading,   setPwLoading]    = useState(false);
  const [pwError,     setPwError]      = useState("");
  const [pwSuccess,   setPwSuccess]    = useState(false);

  const loadPlanners = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<UserData[]>("/api/users/?role=planner&limit=200");
      // Filter only those created by this officer (or show all)
      setPlanners(data.filter((u) => u.role === "planner"));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPlanners(); }, [loadPlanners]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(""); setPwSuccess(false);

    if (newPw !== confirmPw) { setPwError("Passwords do not match."); return; }
    if (newPw.length < 8)    { setPwError("Password must be at least 8 characters."); return; }
    if (!/[A-Z]/.test(newPw)) { setPwError("Password must contain at least one uppercase letter."); return; }
    if (!/[0-9]/.test(newPw)) { setPwError("Password must contain at least one digit."); return; }

    setPwLoading(true);
    try {
      await api.post("/api/auth/change-password", {
        current_password: currentPw,
        new_password: newPw,
      });
      setPwSuccess(true);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setPwError(typeof detail === "string" ? detail : "Password change failed. Endpoint may not be available yet.");
    } finally {
      setPwLoading(false);
    }
  };

  const joinedDate = user
    ? new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <p className="text-sm text-slate-400 mt-1">Account details and security settings</p>
      </div>

      {/* Identity card */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 flex items-start gap-5">
        <div className="w-14 h-14 rounded-full bg-violet-600 flex items-center justify-center text-2xl font-bold text-white shrink-0">
          {user?.full_name?.charAt(0) ?? "O"}
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-white">{user?.full_name}</h2>
          <p className="text-sm text-slate-400">{user?.email}</p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-violet-500/40 bg-violet-500/10 text-violet-400 text-xs font-mono">
              <ShieldCheck className="w-3 h-3" /> RANGE SAFETY OFFICER
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Member since {joinedDate}</p>
        </div>
      </div>

      {/* Change password */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-2 mb-5">
          <KeyRound className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-semibold text-white">Change Password</h3>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Current Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                required
                className="w-full px-3 py-2 pr-9 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-violet-500/50"
              />
              <button type="button" onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">New Password</label>
            <input type={showPw ? "text" : "password"}
              value={newPw} onChange={(e) => setNewPw(e.target.value)}
              required minLength={8}
              placeholder="Min 8 chars, 1 uppercase, 1 digit"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Confirm New Password</label>
            <input type={showPw ? "text" : "password"}
              value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-violet-500/50" />
          </div>

          {pwError && (
            <div className="flex items-center gap-2 text-xs text-red-400">
              <XCircle className="w-3.5 h-3.5 shrink-0" /> {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Password updated successfully.
            </div>
          )}

          <button type="submit" disabled={pwLoading}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
            {pwLoading ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>

      {/* Planners created by this officer */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Planners in System</h3>
          <span className="ml-auto text-xs text-slate-500">{planners.length} total</span>
        </div>

        {loading ? (
          <div className="text-center py-6 text-slate-500 text-sm">Loading…</div>
        ) : planners.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-sm">No planners created yet</div>
        ) : (
          <div className="divide-y divide-white/5">
            {planners.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-3">
                <div className="w-7 h-7 rounded-full bg-cyan-700/50 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {p.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{p.full_name}</p>
                  <p className="text-xs text-slate-500 truncate">{p.email}</p>
                </div>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${p.is_active ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-500/20 text-slate-500"}`}>
                  {p.is_active ? "Active" : "Inactive"}
                </span>
                <span className="shrink-0 text-xs text-slate-500">
                  {new Date(p.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
