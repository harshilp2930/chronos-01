"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import type { SolarSystemViewerProps } from "@/components/planner/solar-system";
import { StatusBadge } from "@/components/planner/status-badge";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Satellite,
  User,
  Clock,
  FileText,
  AlertTriangle,
  Loader2,
  ZoomIn,
  Rocket,
} from "lucide-react";

// Dynamic Three.js import — no SSR
const SolarSystemViewer = dynamic<SolarSystemViewerProps>(
  () =>
    import("@/components/planner/solar-system").then((m) => m.SolarSystemViewer),
  {
    ssr: false,
    loading: () => (
      <div className="h-100 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading 3D scene...
        </div>
      </div>
    ),
  },
);

interface Mission {
  id: string;
  title: string;
  status: string;
  target_body: string;
  vehicle_class: string;
  orbit_type: string | null;
  launch_pad_id: string;
  launch_date: string | null;
  safety_buffer: string | null;
  azimuth_deg: string | null;
  corridor_width_km: string | null;
  downrange_km: string | null;
  delta_v_km_s: string | null;
  scrub_risk_score: string | null;
  officer_notes: string | null;
  created_by: string;
  created_at: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  trajectory_data: { trajectory_points?: SolarSystemViewerProps["trajectoryPoints"] } | null;
}

interface UserData {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2.5 last:border-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <span className="text-xs shrink-0 w-40" style={{ color: "rgba(240,244,255,0.35)", fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
      <span className="text-sm text-right" style={{ color: "#F0F4FF" }}>{value ?? "—"}</span>
    </div>
  );
}

export default function OfficerMissionDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();

  const [mission,        setMission]        = useState<Mission | null>(null);
  const [planner,        setPlanner]        = useState<UserData | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [actionLoading,  setActionLoading]  = useState(false);
  const [simulating,     setSimulating]     = useState(false);
  const [autoSimAttempted, setAutoSimAttempted] = useState(false);
  const [error,          setError]          = useState("");

  // Approve modal state
  const [approveOpen,  setApproveOpen]  = useState(false);
  const [approveNotes, setApproveNotes] = useState("");
  const [approveError, setApproveError] = useState("");

  // Reject modal state
  const [rejectOpen,  setRejectOpen]  = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [rejectError, setRejectError] = useState("");

  // Success banner
  const [successMsg, setSuccessMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Mission>(`/api/missions/${id}`);
      setMission(data);
      // Fetch planner info
      const { data: u } = await api.get<UserData>(`/api/users/${data.created_by}`);
      setPlanner(u);
    } catch {
      setError("Failed to load mission.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleGenerateTrajectory = useCallback(async (mode: "manual" | "auto" = "manual") => {
    if (!mission) return;
    setSimulating(true);
    if (mode === "manual") {
      setError("");
      setSuccessMsg("");
    }
    try {
      const { data } = await api.post<Mission>(`/api/missions/${mission.id}/simulate`);
      setMission(data);
      setSuccessMsg(
        mode === "auto"
          ? "Trajectory path auto-generated from mission details."
          : "Trajectory generated successfully.",
      );
    } catch {
      setError(
        mode === "auto"
          ? "Auto trajectory generation failed. Use Generate Trajectory."
          : "Failed to generate trajectory.",
      );
    } finally {
      setSimulating(false);
    }
  }, [mission]);

  useEffect(() => {
    if (!mission || simulating || autoSimAttempted) return;
    const targetSupported = ["moon", "mars", "venus"].includes((mission.target_body || "").toLowerCase());
    const hasTrajectory = Boolean(mission.trajectory_data?.trajectory_points?.length);
    if (targetSupported && mission.launch_date && !hasTrajectory) {
      setAutoSimAttempted(true);
      void handleGenerateTrajectory("auto");
    }
  }, [mission, simulating, autoSimAttempted, handleGenerateTrajectory]);

  const handleApprove = async () => {
    if (!mission) return;
    setActionLoading(true);
    setApproveError("");
    try {
      const { data } = await api.post<Mission>(`/api/missions/${mission.id}/approve`, {
        notes: approveNotes.trim() || null,
      });
      setMission(data);
      setApproveOpen(false);
      setApproveNotes("");
      setSuccessMsg("Mission approved successfully.");
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setApproveError(typeof detail === "string" ? detail : "Approval failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectNotes.trim()) { setRejectError("Rejection reason is required."); return; }
    if (!mission) return;
    setActionLoading(true);
    setRejectError("");
    try {
      const { data } = await api.post<Mission>(`/api/missions/${mission.id}/reject`, { notes: rejectNotes });
      setMission(data);
      setRejectOpen(false);
      setRejectNotes("");
      setSuccessMsg("Mission rejected.");
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setRejectError(typeof detail === "string" ? detail : "Rejection failed.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#00E5FF", borderTopColor: "transparent" }} />
    </div>
  );

  if (error && !mission) return (
    <div className="text-center py-24">
      <p style={{ color: "#FF3B5C" }}>{error}</p>
      <button onClick={() => router.back()} className="mt-4 text-sm transition-colors" style={{ color: "rgba(240,244,255,0.4)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#F0F4FF")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(240,244,255,0.4)")}>← Go back</button>
    </div>
  );

  const isPending = mission?.status === "pending_approval";
  const canSimulate = Boolean(mission?.launch_date) && ["moon", "mars", "venus"].includes((mission?.target_body || "").toLowerCase());
  const hasTrajectory = Boolean(mission?.trajectory_data?.trajectory_points?.length);

  return (
    <>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Back + header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <button onClick={() => router.push("/dashboard/officer/missions")}
              className="flex items-center gap-1.5 text-sm transition-colors mb-3"
              style={{ color: "rgba(240,244,255,0.4)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#F0F4FF")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(240,244,255,0.4)")}>
              <ArrowLeft className="w-4 h-4" /> All Missions
            </button>
            <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "#F0F4FF" }}>{mission?.title}</h1>
            <div className="flex items-center gap-3 mt-2">
              {mission && <StatusBadge status={mission.status} />}
              <span className="text-xs text-slate-500 font-mono">{id?.slice(0, 8).toUpperCase()}</span>
            </div>
          </div>

          {/* Action bar */}
          {isPending && (
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setApproveOpen(true)} disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
                style={{ background: "#00C896" }}
              >
                <CheckCircle2 className="w-4 h-4" /> Approve
              </button>
              <button onClick={() => setRejectOpen(true)} disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
                style={{ background: "#FF3B5C" }}
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </div>
          )}
        </div>

        {/* Success / error banners */}
        {successMsg && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm" style={{ background: "rgba(0,200,150,0.07)", border: "1px solid rgba(0,200,150,0.25)", color: "#00C896" }}>
            <CheckCircle2 className="w-4 h-4" /> {successMsg}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm" style={{ background: "rgba(255,59,92,0.07)", border: "1px solid rgba(255,59,92,0.25)", color: "#FF3B5C" }}>
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}

        {/* Officer notes */}
        {mission?.officer_notes && (
          <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border`}
            style={mission.status === "approved" ? { background: "rgba(0,200,150,0.07)", borderColor: "rgba(0,200,150,0.25)" } : { background: "rgba(255,59,92,0.07)", borderColor: "rgba(255,59,92,0.25)" }}>
            <FileText className="w-4 h-4 mt-0.5 shrink-0" style={{ color: mission.status === "approved" ? "#00C896" : "#FF3B5C" }} />
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: mission.status === "approved" ? "#00C896" : "#FF3B5C" }}>
                {mission.status === "approved" ? "Approval Notes" : "Rejection Reason"}
              </p>
              <p className="text-sm" style={{ color: mission.status === "approved" ? "rgba(0,200,150,0.9)" : "rgba(255,59,92,0.9)" }}>
                {mission.officer_notes}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Mission details */}
          <div className="rounded-xl p-5" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "#0F1923" }}>
            <div className="flex items-center gap-2 mb-4">
              <Satellite className="w-4 h-4" style={{ color: "#00E5FF" }} />
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(240,244,255,0.5)" }}>Mission Parameters</h2>
            </div>
            <InfoRow label="Target Body"      value={<span className="capitalize">{mission?.target_body}</span>} />
            <InfoRow label="Vehicle Class"    value={<span className="uppercase">{mission?.vehicle_class}</span>} />
            <InfoRow label="Orbit Type"       value={<span className="uppercase">{mission?.orbit_type ?? "—"}</span>} />
            <InfoRow label="Launch Pad"       value={<span className="uppercase">{mission?.launch_pad_id}</span>} />
            <InfoRow label="Launch Date"      value={mission?.launch_date ? new Date(mission.launch_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"} />
            <InfoRow label="Delta-V (km/s)"   value={mission?.delta_v_km_s ?? "—"} />
            <InfoRow label="Scrub Risk"       value={mission?.scrub_risk_score ? `${(parseFloat(mission.scrub_risk_score) * 100).toFixed(1)}%` : "—"} />
          </div>

          {/* Safety parameters */}
          <div className="rounded-xl p-5" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "#0F1923" }}>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4" style={{ color: "#F59E0B" }} />
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(240,244,255,0.5)" }}>Safety Parameters</h2>
            </div>
            <InfoRow label="Safety Buffer"    value={mission?.safety_buffer ? `${mission.safety_buffer}×` : "—"} />
            <InfoRow label="Azimuth"          value={mission?.azimuth_deg ? `${mission.azimuth_deg}°` : "—"} />
            <InfoRow label="Corridor Width"   value={mission?.corridor_width_km ? `${mission.corridor_width_km} km` : "—"} />
            <InfoRow label="Downrange"        value={mission?.downrange_km ? `${mission.downrange_km} km` : "—"} />
          </div>

          {/* Planner info */}
          <div className="rounded-xl p-5" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "#0F1923" }}>
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4" style={{ color: "#00E5FF" }} />
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(240,244,255,0.5)" }}>Planner</h2>
            </div>
            <InfoRow label="Name"  value={planner?.full_name} />
            <InfoRow label="Email" value={planner?.email} />
            <InfoRow label="Role"  value={<span className="uppercase text-xs font-mono">{planner?.role}</span>} />
          </div>

          {/* Timeline */}
          <div className="rounded-xl p-5" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "#0F1923" }}>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4" style={{ color: "rgba(240,244,255,0.4)" }} />
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(240,244,255,0.5)" }}>Timeline</h2>
            </div>
            <InfoRow label="Created"   value={mission?.created_at  ? new Date(mission.created_at).toLocaleString()  : "—"} />
            <InfoRow label="Submitted" value={mission?.submitted_at ? new Date(mission.submitted_at).toLocaleString() : "—"} />
            <InfoRow label="Reviewed"  value={mission?.reviewed_at  ? new Date(mission.reviewed_at).toLocaleString()  : "—"} />
          </div>
        </div>

        {/* 3D Solar System */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.4)" }}>
          <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <ZoomIn className="w-4 h-4" style={{ color: "#00E5FF" }} />
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(240,244,255,0.5)" }}>
              3D Trajectory — {mission?.target_body ? mission.target_body.charAt(0).toUpperCase() + mission.target_body.slice(1) : ""}
            </h2>
            <span className="text-xs ml-2" style={{ color: "rgba(240,244,255,0.25)" }}>Drag to rotate · scroll to zoom</span>
            {canSimulate && !hasTrajectory && (
              <button
                onClick={() => void handleGenerateTrajectory("manual")}
                disabled={simulating}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-60"
                style={{ border: "1px solid rgba(0,102,255,0.4)", color: "#0066FF", background: "transparent" }}
              >
                {simulating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
                {simulating ? "Generating…" : "Generate Trajectory"}
              </button>
            )}
          </div>
          <SolarSystemViewer
            target={mission?.target_body ?? "mars"}
            trajectoryPoints={mission?.trajectory_data?.trajectory_points}
            height={420}
          />
        </div>

        {/* Bottom action bar repeated for long pages */}
        {isPending && (
          <div className="flex items-center justify-end gap-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-sm flex-1" style={{ color: "rgba(240,244,255,0.4)" }}>Your decision will be recorded and the planner will be notified.</p>
            <button onClick={() => setRejectOpen(true)} disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
              style={{ background: "#FF3B5C" }}
            >
              <XCircle className="w-4 h-4" /> Reject
            </button>
            <button onClick={() => setApproveOpen(true)} disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
              style={{ background: "#00C896" }}
            >
              <CheckCircle2 className="w-4 h-4" /> Approve
            </button>
          </div>
        )}
      </div>

      {/* ── Approve Modal ── */}
      {approveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "#0F1923" }}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" style={{ color: "#00C896" }} />
              <h2 className="text-base font-semibold" style={{ color: "#F0F4FF" }}>Approve Mission</h2>
            </div>
            <p className="text-sm" style={{ color: "rgba(240,244,255,0.4)" }}>
              Add optional notes for the planner (e.g. clearance conditions, caveats).
            </p>
            <textarea value={approveNotes} onChange={(e) => { setApproveNotes(e.target.value); setApproveError(""); }}
              placeholder="Notes (optional) — e.g. All zones clear. Approved."
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm placeholder:text-[rgba(240,244,255,0.2)] focus:outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#F0F4FF" }}
            />
            {approveError && <p className="text-xs" style={{ color: "#FF3B5C" }}>{approveError}</p>}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button onClick={() => { setApproveOpen(false); setApproveNotes(""); setApproveError(""); }}
                className="px-4 py-2 rounded-lg text-sm transition-colors" style={{ color: "rgba(240,244,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#F0F4FF")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(240,244,255,0.4)")}>
                Cancel
              </button>
              <button onClick={handleApprove} disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
                style={{ background: "#00C896" }}>
                {actionLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Approving…</> : <><CheckCircle2 className="w-4 h-4" /> Confirm Approval</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "#0F1923" }}>
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5" style={{ color: "#FF3B5C" }} />
              <h2 className="text-base font-semibold" style={{ color: "#F0F4FF" }}>Reject Mission</h2>
            </div>
            <p className="text-sm" style={{ color: "rgba(240,244,255,0.4)" }}>
              Provide a clear reason for rejection. This will be shown to the planner.
            </p>
            <textarea value={rejectNotes} onChange={(e) => { setRejectNotes(e.target.value); setRejectError(""); }}
              placeholder="Rejection reason (required)…"
              rows={4}
              className="w-full px-3 py-2 rounded-lg text-sm placeholder:text-[rgba(240,244,255,0.2)] focus:outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#F0F4FF" }}
            />
            {rejectError && <p className="text-xs" style={{ color: "#FF3B5C" }}>{rejectError}</p>}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button onClick={() => { setRejectOpen(false); setRejectNotes(""); setRejectError(""); }}
                className="px-4 py-2 rounded-lg text-sm transition-colors" style={{ color: "rgba(240,244,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#F0F4FF")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(240,244,255,0.4)")}>
                Cancel
              </button>
              <button onClick={handleReject} disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
                style={{ background: "#FF3B5C" }}>
                {actionLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Rejecting…</> : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
