"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Send,
  Loader2,
  CalendarDays,
  Satellite,
  Shield,
  CloudLightning,
  GanttChartSquare,
  ZoomIn,
  Rocket,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import api from "@/lib/api";
import type { SolarSystemViewerProps } from "@/components/planner/solar-system";
import { Button } from "@/components/ui/button";
import { NoisePatternCard } from "@/components/ui/card-with-noise-pattern";
import { StatusBadge } from "@/components/planner/status-badge";
import { SafetyCanvas } from "@/components/planner/safety-canvas";
import { WeatherGauge } from "@/components/planner/weather-gauge";
import { useAuthStore } from "@/store/auth";

// Dynamic Three.js import -- no SSR
const SolarSystemViewer = dynamic<SolarSystemViewerProps>(
  () =>
    import("@/components/planner/solar-system").then((m) => m.SolarSystemViewer),
  {
    ssr: false,
    loading: () => (
      <div className="h-125 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading 3D scene...
        </div>
      </div>
    ),
  },
);

// Types

interface TrajectoryPoint {
  x: number;
  y: number;
  z: number;
  t: number;
  vx: number;
  vy: number;
  vz: number;
  r_km: number;
}

interface TrajectoryData {
  target: string;
  launch_date: string;
  arrival_date: string;
  delta_v_departure_km_s: number;
  delta_v_arrival_km_s: number;
  total_delta_v_km_s: number;
  transfer_time_days: number;
  trajectory_points: TrajectoryPoint[];
}

interface OptWindow {
  rank: number;
  launch_date: string;
  arrival_date: string;
  tof_days: number;
  total_delta_v_km_s: number;
  launch_jd: number;
}

interface OptimizationData {
  target: string;
  best_window: OptWindow;
  top_windows: OptWindow[];
  convergence_history?: number[];
}

interface Mission {
  id: string;
  title: string;
  status: string;
  target_body: string;
  launch_pad_id: string;
  vehicle_class: string;
  orbit_type: string | null;
  launch_date: string | null;
  safety_buffer: string | null;
  azimuth_deg: string | null;
  corridor_width_km: string | null;
  downrange_km: string | null;
  delta_v_km_s: string | null;
  scrub_risk_score: string | null;
  officer_notes: string | null;
  reviewed_by: string | null;
  created_at: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  trajectory_data: TrajectoryData | null;
  optimization_data: OptimizationData | null;
}

interface WeatherResult {
  scrub_probability: number;
  risk_level: string;
  go_no_go: string;
  factors?: Record<string, number>;
}

interface ScrubApiResponse {
  scrub_probability: number;
  risk_level: string;
  go_no_go: string;
  lwcc_violations: string[];
  top_risk_factor: string;
}

// Helpers

const VEHICLE_TO_SAFETY: Record<string, string> = {
  sounding: "light",
  sslv:     "light",
  pslv:     "medium",
  gslv2:    "heavy",
  lvm3:     "superheavy",
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 last:border-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <span className="text-xs font-medium min-w-30" style={{ color: "rgba(240,244,255,0.35)", fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
      <span className="text-xs font-mono text-right" style={{ color: "#F0F4FF" }}>{value ?? "--"}</span>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  iconColor,
  children,
  subtitle,
  delay = 0,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  iconColor: string;
  children: React.ReactNode;
  subtitle?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="h-full"
    >
      <NoisePatternCard className="h-full">
          <div className="p-6 pb-2">
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] flex items-center gap-2" style={{ color: "rgba(240,244,255,0.5)" }}>
              <Icon className={"w-4 h-4 "} style={{ color: iconColor }} />
              {title}
            </h3>
            {subtitle && <p className="text-[11px] mt-1" style={{ color: "rgba(240,244,255,0.3)" }}>{subtitle}</p>}
          </div>
          <div className="px-6 pb-6">{children}</div>
      </NoisePatternCard>
    </motion.div>
  );
}

// Trajectory chart

function TrajectoryChart({ points }: { points: TrajectoryPoint[] }) {
  const step = Math.max(1, Math.floor(points.length / 150));
  const data = points
    .filter((_, i) => i % step === 0)
    .map((p) => ({
      day: Math.round(p.t / 86400),
      r_au: +(p.r_km / 1.496e8).toFixed(4),
    }));

  const minAu = Math.floor(Math.min(...data.map((d) => d.r_au)) * 10) / 10;
  const maxAu = Math.ceil(Math.max(...data.map((d) => d.r_au)) * 10) / 10;

  return (
    <div className="mt-4 -mx-1">
      <p className="text-[10px] font-mono mb-3 uppercase tracking-widest px-1" style={{ color: "rgba(240,244,255,0.3)" }}>
        Heliocentric Distance over Transfer
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 20 }}>
          <defs>
            <linearGradient id="auGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#00E5FF" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#00E5FF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: "rgba(240,244,255,0.25)", fontSize: 10, fontFamily: "monospace" }}
            axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
            tickLine={false}
            label={{ value: "Days", position: "insideBottom", offset: -12, fill: "rgba(240,244,255,0.25)", fontSize: 10, fontFamily: "monospace" }}
          />
          <YAxis
            domain={[minAu, maxAu]}
            tick={{ fill: "rgba(240,244,255,0.25)", fontSize: 10, fontFamily: "monospace" }}
            tickFormatter={(v: number) => v.toFixed(1) + " AU"}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <ReferenceLine
            y={1.0}
            stroke="#F59E0B"
            strokeDasharray="6 3"
            strokeOpacity={0.45}
            label={{ value: "1 AU", position: "insideTopLeft", fill: "#F59E0B", fontSize: 9, fontFamily: "monospace" }}
          />
          <Tooltip
            contentStyle={{ background: "#0F1923", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 12px" }}
            labelStyle={{ color: "rgba(240,244,255,0.25)", fontSize: 10, fontFamily: "monospace", marginBottom: 4 }}
            itemStyle={{ color: "#00E5FF", fontSize: 11, fontFamily: "monospace" }}
            formatter={(v) => [(+(v ?? 0)).toFixed(4) + " AU", "Distance"] as [string, string]}
            labelFormatter={(l) => "Day " + l}
            cursor={{ stroke: "#00E5FF", strokeWidth: 1, strokeDasharray: "4 2", strokeOpacity: 0.5 }}
          />
          <Area type="monotone" dataKey="r_au" stroke="#00E5FF" strokeWidth={2} fill="url(#auGrad)"
            dot={false} activeDot={{ r: 4, fill: "#00E5FF", strokeWidth: 0 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Optimization windows table

function WindowsTable({ windows, bestJd }: { windows: OptWindow[]; bestJd: number }) {
  const top3 = windows.slice(0, 3);
  return (
    <div className="mt-1 overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", color: "rgba(240,244,255,0.35)" }}>
            <th className="py-1.5 pr-3 text-left font-medium">#</th>
            <th className="py-1.5 pr-3 text-left font-medium">Launch Date</th>
            <th className="py-1.5 pr-3 text-left font-medium">Arrival Date</th>
            <th className="py-1.5 pr-3 text-right font-medium">TOF (d)</th>
            <th className="py-1.5 text-right font-medium">DV (km/s)</th>
          </tr>
        </thead>
        <tbody>
          {top3.map((w) => {
            const isBest = Math.abs(w.launch_jd - bestJd) < 1;
            return (
              <tr key={w.rank} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", color: isBest ? "#00E5FF" : "rgba(240,244,255,0.6)" }}>
                <td className="py-2 pr-3">
                  {isBest ? (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#00E5FF" }} />
                      {w.rank}
                    </span>
                  ) : w.rank}
                </td>
                <td className="py-2 pr-3">{w.launch_date}</td>
                <td className="py-2 pr-3">{w.arrival_date}</td>
                <td className="py-2 pr-3 text-right">{w.tof_days.toFixed(1)}</td>
                <td className="py-2 text-right font-bold" style={{ color: isBest ? "#00E5FF" : "#0066FF" }}>{w.total_delta_v_km_s.toFixed(4)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Page

export default function MissionDetailPage() {
  const { id }    = useParams<{ id: string }>();
  const { user }  = useAuthStore();
  const router    = useRouter();

  const [mission,        setMission]        = useState<Mission | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [notFound,       setNotFound]       = useState(false);
  const [safetyData,     setSafetyData]     = useState<unknown>(null);
  const [safetyLoading,  setSafetyLoading]  = useState(false);
  const [weatherData,    setWeatherData]    = useState<WeatherResult | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [reviewerName,   setReviewerName]   = useState<string | null>(null);
  const [submitting,     setSubmitting]     = useState(false);
  const [pdfLoading,     setPdfLoading]     = useState(false);
  const [simulating,     setSimulating]     = useState(false);
  const [actionMsg,      setActionMsg]      = useState("");
  const [autoSimAttempted, setAutoSimAttempted] = useState(false);

  useEffect(() => {
    if (!user) { router.push("/auth/login"); return; }
    api
      .get("/api/missions/"+id)
      .then(({ data }) => setMission(data))
      .catch((e) => { if (e?.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [id, user, router]);

  useEffect(() => {
    if (!mission?.reviewed_by) return;
    api
      .get("/api/users/"+mission.reviewed_by)
      .then(({ data }) => setReviewerName(data.full_name ?? data.email ?? "Officer"))
      .catch(() => setReviewerName("Officer"));
  }, [mission?.reviewed_by]);

  useEffect(() => {
    if (!mission?.launch_pad_id || !mission?.vehicle_class) return;
    setSafetyLoading(true);
    api
      .post("/api/safety/calculate", {
        pad_id:             mission.launch_pad_id,
        vehicle_class:      VEHICLE_TO_SAFETY[mission.vehicle_class] ?? "medium",
        wind_speed_kmh:     12,
        wind_direction_deg: parseFloat(mission.azimuth_deg ?? "90") || 90,
        launch_azimuth_deg: mission.azimuth_deg ? parseFloat(mission.azimuth_deg) : null,
      })
      .then(({ data }) => setSafetyData(data))
      .catch(() => {})
      .finally(() => setSafetyLoading(false));
  }, [mission]);

  useEffect(() => {
    if (!mission?.launch_pad_id) return;
    setWeatherLoading(true);

    // Generate realistic weather from launch date + pad (monsoon-aware)
    const launchDate = mission.launch_date ?? new Date().toISOString().split("T")[0];
    const padId      = mission.launch_pad_id;
    const d          = new Date(launchDate);
    const month      = d.getMonth() + 1;
    const doy        = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000);
    const padOff     = padId === "vssc" ? 1000 : padId === "aki" ? 2000 : 0;
    const r          = (n: number) => Math.abs(Math.sin((doy + padOff) * 9973 + n * 1031) % 1);
    const isMonsoon    = month >= 6 && month <= 9;
    const isPreMonsoon = month >= 3 && month <= 5;
    const isNEMonsoon  = month === 10 || month === 11;
    const baseWind   = isMonsoon ? 26 : isPreMonsoon ? 18 : 11;
    const windSpeed  = +(baseWind + r(1) * (isMonsoon ? 35 : isPreMonsoon ? 20 : 14)).toFixed(1);
    const windGust   = +(windSpeed * (1.25 + r(2) * 0.45)).toFixed(1);
    const baseVis    = isMonsoon ? 5 : isNEMonsoon ? 12 : isPreMonsoon ? 14 : 22;
    const visibility = +Math.max(1.5, baseVis + (r(3) - 0.4) * (isMonsoon ? 6 : 4)).toFixed(1);
    const baseCeil   = isMonsoon ? 1800 : isNEMonsoon ? 4000 : isPreMonsoon ? 5500 : 14000;
    const cloudCeilFt = +Math.max(400, baseCeil + (r(4) - 0.5) * baseCeil * 0.7).toFixed(0);
    const baseTemp   = isPreMonsoon ? 35 : isMonsoon ? 28 : isNEMonsoon ? 27 : 23;
    const temp       = +(baseTemp + (r(5) - 0.5) * 7).toFixed(1);
    const basePrecip = isMonsoon ? 4.5 : isNEMonsoon ? 1.2 : 0;
    const precip     = +Math.max(0, basePrecip + r(6) * (isMonsoon ? 18 : isNEMonsoon ? 5 : 1.5) - (isMonsoon ? 1 : 0)).toFixed(1);
    const baseLightning = isMonsoon ? 12 : isPreMonsoon ? 35 : isNEMonsoon ? 25 : 300;
    const lightning  = +Math.max(2, baseLightning + (r(7) - 0.3) * baseLightning).toFixed(1);
    const baseHumidity = isMonsoon ? 86 : isPreMonsoon ? 66 : isNEMonsoon ? 72 : 54;
    const humidity   = +Math.min(100, Math.max(20, baseHumidity + (r(8) - 0.5) * 22)).toFixed(0);

    api
      .post<ScrubApiResponse>("/api/v1/scrub/predict", {
        site_id:               padId,
        wind_speed_kmh:        windSpeed,
        wind_gust_kmh:         windGust,
        visibility_km:         visibility,
        cloud_ceiling_ft:      cloudCeilFt,
        temperature_c:         temp,
        precipitation_mm_h:    precip,
        lightning_distance_km: lightning,
        humidity_pct:          humidity,
      })
      .then(({ data }) =>
        setWeatherData({
          scrub_probability: data.scrub_probability / 100,
          risk_level: data.risk_level.toLowerCase(),
          go_no_go: data.go_no_go,
          factors: undefined,
        })
      )
      .catch(() => {})
      .finally(() => setWeatherLoading(false));
  }, [mission]);

  const handleSubmit = async () => {
    if (!mission) return;
    setSubmitting(true);
    try {
      await api.post("/api/missions/"+mission.id+"/submit");
      setMission((m) => m ? { ...m, status: "pending_approval" } : m);
      setActionMsg("Mission submitted for officer review.");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail ?? "Submission failed";
      setActionMsg("Error: "+msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSimulate = useCallback(async (mode: "manual" | "auto" = "manual") => {
    if (!mission) return;
    setSimulating(true);
    if (mode === "manual") {
      setActionMsg("");
    }
    try {
      const { data } = await api.post("/api/missions/"+mission.id+"/simulate");
      setMission(data);
      setActionMsg(
        mode === "auto"
          ? "Trajectory path auto-generated from mission details."
          : "Simulation complete — trajectory data updated.",
      );
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail ?? "Simulation failed";
      setActionMsg(
        mode === "auto"
          ? "Error: Auto trajectory generation failed. Click Generate Trajectory."
          : "Error: "+msg,
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
      void handleSimulate("auto");
    }
  }, [mission, simulating, autoSimAttempted, handleSimulate]);

  const handleExportPdf = async () => {
    if (!mission) return;
    setPdfLoading(true);
    try {
      const response = await api.get("/api/missions/"+mission.id+"/export-pdf", {
        responseType: "blob",
      });
      const dateStr  = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const titleStr = mission.title.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_]/g, "");
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a   = document.createElement("a");
      a.href    = url;
      a.download = "CHRONOS1_Mission_"+titleStr+"_"+dateStr+".pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      setActionMsg("PDF export failed. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (notFound || !mission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <GanttChartSquare className="w-12 h-12 text-slate-700" />
        <p className="text-slate-400">Mission not found.</p>
        <Link href="/dashboard/planner/missions">
          <Button variant="outline" className="border-white/20 text-slate-300 bg-transparent">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to History
          </Button>
        </Link>
      </div>
    );
  }

  const trajData = mission.trajectory_data;
  const optData  = mission.optimization_data;
  const canSimulate = mission.launch_date && ["moon", "mars", "venus"].includes((mission.target_body || "").toLowerCase());
  const hasTrajectory = Boolean(trajData?.trajectory_points?.length);

  return (
    <div className="flex flex-col gap-4 pb-12">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div>
          <Link
            href="/dashboard/planner/missions"
            className="flex items-center gap-1.5 text-xs mb-2 transition-colors"
            style={{ color: "rgba(240,244,255,0.35)" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Mission History
          </Link>
          <h1 className="text-[28px] font-bold tracking-tight" style={{ color: "#F0F4FF" }}>{mission.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <StatusBadge status={mission.status} />
            <span className="text-xs" style={{ color: "rgba(240,244,255,0.35)" }}>Created {new Date(mission.created_at).toLocaleDateString()}</span>
            {mission.submitted_at && (
              <span className="text-xs text-slate-500">
                · Submitted {new Date(mission.submitted_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canSimulate && !hasTrajectory && (
            <Button onClick={() => void handleSimulate("manual")} disabled={simulating} variant="outline"
              className="gap-2 text-sm bg-transparent"
              style={{ border: "1px solid rgba(0,102,255,0.4)", color: "#0066FF" }}
            >
              {simulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              {simulating ? "Generating…" : "Generate Trajectory"}
            </Button>
          )}
          {mission.status === "draft" && user?.role !== "individual" && (
            <Button onClick={handleSubmit} disabled={submitting}
              className="font-semibold gap-2 text-sm text-black"
              style={{ background: "#00E5FF" }}
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                : <><Send className="w-4 h-4" /> Submit for Approval</>}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleExportPdf}
            disabled={pdfLoading}
            className="border-white/20 text-slate-300 hover:text-white bg-transparent gap-2 text-sm"
          >
            {pdfLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              : <><Download className="w-4 h-4" /> Export PDF</>}
          </Button>
        </div>
      </motion.div>

      {/* Feedback */}
      {actionMsg && (
        <div className="px-4 py-2.5 rounded-xl border text-sm"
          style={actionMsg.startsWith("Error") ? { borderColor: "rgba(255,59,92,0.3)", background: "rgba(255,59,92,0.08)", color: "#FF3B5C" } : { borderColor: "rgba(0,229,255,0.25)", background: "rgba(0,229,255,0.06)", color: "#00E5FF" }}>
          {actionMsg}
        </div>
      )}

      {/* APPROVED banner */}
      {mission.status === "approved" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-start gap-3 px-5 py-4 rounded-xl"
          style={{ border: "1px solid rgba(0,200,150,0.25)", background: "rgba(0,200,150,0.07)" }}
        >
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#00C896" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#00C896" }}>
              Approved by {reviewerName ?? "Officer"}
            </p>
            {mission.reviewed_at && (
              <p className="text-xs mt-0.5" style={{ color: "rgba(0,200,150,0.6)" }}>
                {new Date(mission.reviewed_at).toLocaleString()}
              </p>
            )}
            {mission.officer_notes && (
              <p className="text-xs mt-1" style={{ color: "rgba(0,200,150,0.8)" }}>{mission.officer_notes}</p>
            )}
          </div>
        </motion.div>
      )}

      {/* REJECTED banner */}
      {mission.status === "rejected" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-start gap-3 px-5 py-4 rounded-xl"
          style={{ border: "1px solid rgba(255,59,92,0.25)", background: "rgba(255,59,92,0.07)" }}
        >
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#FF3B5C" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#FF3B5C" }}>
              Rejected by {reviewerName ?? "Officer"}
            </p>
            {mission.reviewed_at && (
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,59,92,0.6)" }}>
                {new Date(mission.reviewed_at).toLocaleString()}
              </p>
            )}
            {mission.officer_notes && (
              <p className="text-xs mt-1 italic" style={{ color: "rgba(255,59,92,0.8)" }}>
                &ldquo;{mission.officer_notes}&rdquo;
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* 3D Solar System -- full width, 500px */}
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <NoisePatternCard>
            <div className="p-6 pb-2">
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] flex items-center gap-2" style={{ color: "rgba(240,244,255,0.5)" }}>
                <ZoomIn className="w-4 h-4" style={{ color: "#00E5FF" }} />
                3D Trajectory --{" "}
                {mission.target_body.charAt(0).toUpperCase() + mission.target_body.slice(1)}
              </h3>
              <p className="text-[11px] mt-1" style={{ color: "rgba(240,244,255,0.3)" }}>
                Drag to rotate · scroll to zoom · cyan arc = transfer orbit · green dot = launch pad
              </p>
            </div>
            <div className="px-6 pb-6">
              <SolarSystemViewer
                target={mission.target_body}
                trajectoryPoints={trajData?.trajectory_points}
                height={500}
              />
            </div>
        </NoisePatternCard>
      </motion.div>

      {/* Main data grid — 2 cols on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Mission Parameters */}
        <SectionCard title="Mission Parameters" icon={Satellite} iconColor="#00E5FF" delay={0.15}>
          <InfoRow label="Target Body"    value={mission.target_body.toUpperCase()} />
          <InfoRow label="Launch Pad"     value={mission.launch_pad_id.toUpperCase()} />
          <InfoRow label="Vehicle Class"  value={mission.vehicle_class.toUpperCase()} />
          <InfoRow label="Orbit Type"     value={mission.orbit_type?.toUpperCase() ?? "--"} />
          <InfoRow label="Launch Date"    value={mission.launch_date ?? "--"} />
          <InfoRow label="Azimuth"        value={mission.azimuth_deg ? mission.azimuth_deg+"deg" : "--"} />
          <InfoRow label="Corridor"       value={mission.corridor_width_km ? mission.corridor_width_km+" km" : "--"} />
          <InfoRow label="Downrange"      value={mission.downrange_km ? mission.downrange_km+" km" : "--"} />
          <InfoRow label="Safety Buffer"  value={mission.safety_buffer ? Number(mission.safety_buffer).toFixed(1)+"x" : "--"} />
        </SectionCard>

        {/* Physics Results */}
        <SectionCard
          title="Physics Results"
          icon={Rocket}
          iconColor="#0066FF"
          delay={0.18}
          subtitle={trajData
            ? "Lambert + RK4 propagator · "+mission.target_body+" transfer"
            : "No simulation data -- run simulation from mission editor"}
        >
          {trajData ? (
            <>
              <InfoRow label="DV Departure" value={<span className="text-violet-300">{trajData.delta_v_departure_km_s.toFixed(4)} km/s</span>} />
              <InfoRow label="DV Arrival"   value={<span className="text-violet-300">{trajData.delta_v_arrival_km_s.toFixed(4)} km/s</span>} />
              <InfoRow label="Total DV"     value={<span className="font-bold text-cyan-300">{trajData.total_delta_v_km_s.toFixed(4)} km/s</span>} />
              <InfoRow label="Transfer"     value={<span className="text-amber-300">{trajData.transfer_time_days.toFixed(1)} days</span>} />
              <InfoRow label="Departure"    value={trajData.launch_date} />
              <InfoRow label="Arrival"      value={trajData.arrival_date} />
              <InfoRow label="Waypoints"    value={trajData.trajectory_points.length+" pts"} />
              {trajData.trajectory_points.length > 5 && (
                <TrajectoryChart points={trajData.trajectory_points} />
              )}
            </>
          ) : (
            <>
              <InfoRow
                label="DV Total"
                value={mission.delta_v_km_s ? Number(mission.delta_v_km_s).toFixed(4)+" km/s" : "--"}
              />
              <InfoRow
                label="Scrub Risk"
                value={mission.scrub_risk_score ? Math.round(Number(mission.scrub_risk_score)*100)+"%" : "--"}
              />
              <Button onClick={() => void handleSimulate("manual")} disabled={simulating || !mission.launch_date}
                className="w-full mt-4 font-semibold gap-2 text-sm text-black"
                style={{ background: "#0066FF" }}
              >{simulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                {simulating ? "Generating trajectory…" : mission.launch_date ? "Generate Trajectory" : "Set launch date to simulate"}
              </Button>
            </>
          )}
        </SectionCard>

        {/* Safety Exclusion Zones */}
        <SectionCard
          title="Safety Exclusion Zones"
          icon={Shield}
          iconColor="#F59E0B"
          delay={0.22}
          subtitle={mission.azimuth_deg ? "Azimuth "+mission.azimuth_deg+" deg · corridor enabled" : undefined}
        >
          <SafetyCanvas data={safetyData as never} loading={safetyLoading} />
        </SectionCard>

        {/* Weather Risk Assessment */}
        <SectionCard
          title="Weather Risk Assessment"
          icon={CloudLightning}
          iconColor="#00E5FF"
          delay={0.25}
          subtitle="Based on typical launch day conditions at pad"
        >
          <div className="flex items-center justify-center py-4">
            {weatherLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading weather...
              </div>
            ) : weatherData ? (
              <WeatherGauge
                probability={weatherData.scrub_probability}
                riskLevel={weatherData.risk_level}
                goNoGo={weatherData.go_no_go}
                factors={weatherData.factors}
              />
            ) : (
              <p className="text-slate-500 text-sm">No weather data available.</p>
            )}
          </div>
        </SectionCard>

        {/* Launch Window Optimisation — spans full width when present */}
        {optData && optData.top_windows && optData.top_windows.length > 0 && (
          <div className="lg:col-span-2">
            <SectionCard
              title="Launch Window Optimisation"
              icon={TrendingUp}
              iconColor="#00C896"
              delay={0.28}
              subtitle={"Genetic algorithm · "+optData.target+" · top 3 windows shown"}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="rounded-lg px-4 py-3" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                  <p className="text-[10px] font-mono mb-1 uppercase tracking-wide" style={{ color: "rgba(240,244,255,0.3)" }}>Best Launch</p>
                  <p className="text-sm font-mono font-bold" style={{ color: "#00E5FF" }}>{optData.best_window.launch_date}</p>
                </div>
                <div className="rounded-lg px-4 py-3" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                  <p className="text-[10px] font-mono mb-1 uppercase tracking-wide" style={{ color: "rgba(240,244,255,0.3)" }}>Min DV</p>
                  <p className="text-sm font-mono font-bold" style={{ color: "#0066FF" }}>{optData.best_window.total_delta_v_km_s.toFixed(4)} km/s</p>
                </div>
                <div className="rounded-lg px-4 py-3" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                  <p className="text-[10px] font-mono mb-1 uppercase tracking-wide" style={{ color: "rgba(240,244,255,0.3)" }}>Transfer Time</p>
                  <p className="text-sm font-mono font-bold" style={{ color: "#F59E0B" }}>{optData.best_window.tof_days.toFixed(0)} days</p>
                </div>
              </div>
              <WindowsTable windows={optData.top_windows} bestJd={optData.best_window.launch_jd} />
            </SectionCard>
          </div>
        )}

        {/* Approval Timeline — spans full width */}
        <div className="lg:col-span-2">
          <SectionCard title="Approval Timeline" icon={CalendarDays} iconColor="#0066FF" delay={0.31}>
            {/* Step track */}
            <div className="flex items-start gap-0 mt-2">

              {/* Step 1 — Draft */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ border: "2px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.04)" }}>
                  <span className="text-[10px] font-bold font-mono" style={{ color: "rgba(240,244,255,0.4)" }}>1</span>
                </div>
                <span className="text-[10px] font-mono mt-1.5 uppercase tracking-wide" style={{ color: "rgba(240,244,255,0.35)" }}>Draft</span>
              </div>

              {/* Connector */}
              <div className="flex-1 h-px mt-4 opacity-60" style={{ background: "linear-gradient(to right, rgba(255,255,255,0.15), #00E5FF)" }} />

              {/* Step 2 — Submitted */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ border: `2px solid ${mission.submitted_at ? "#00E5FF" : "rgba(255,255,255,0.1)"}`, background: mission.submitted_at ? "rgba(0,229,255,0.08)" : "rgba(255,255,255,0.03)" }}>
                  <span className="text-[10px] font-bold font-mono" style={{ color: mission.submitted_at ? "#00E5FF" : "rgba(240,244,255,0.2)" }}>2</span>
                </div>
                <span className="text-[10px] font-mono mt-1.5 uppercase tracking-wide" style={{ color: "rgba(240,244,255,0.35)" }}>Submitted</span>
                {mission.submitted_at && (
                  <span className="text-[10px] font-mono mt-0.5 max-w-22 text-center leading-tight" style={{ color: "rgba(0,229,255,0.6)" }}>
                    {new Date(mission.submitted_at).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Connector */}
              <div className="flex-1 h-px mt-4 opacity-60" style={{ background: ["approved","rejected","pending_approval"].includes(mission.status) ? "linear-gradient(to right, #00E5FF, #0066FF)" : "rgba(255,255,255,0.1)" }} />

              {/* Step 3 — Under Review */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{
                  border: `2px solid ${mission.status === "pending_approval" ? "#F59E0B" : ["approved","rejected"].includes(mission.status) ? "#0066FF" : "rgba(255,255,255,0.1)"}`,
                  background: mission.status === "pending_approval" ? "rgba(245,158,11,0.1)" : ["approved","rejected"].includes(mission.status) ? "rgba(0,102,255,0.08)" : "rgba(255,255,255,0.03)",
                  boxShadow: mission.status === "pending_approval" ? "0 0 0 4px rgba(245,158,11,0.12)" : "none",
                }}>
                  <span className="text-[10px] font-bold font-mono" style={{ color: mission.status === "pending_approval" ? "#F59E0B" : ["approved","rejected"].includes(mission.status) ? "#0066FF" : "rgba(240,244,255,0.2)" }}>3</span>
                </div>
                <span className="text-[10px] font-mono mt-1.5 uppercase tracking-wide" style={{ color: "rgba(240,244,255,0.35)" }}>Review</span>
                {mission.status === "pending_approval" && (
                  <span className="text-[10px] font-mono mt-0.5" style={{ color: "rgba(245,158,11,0.7)" }}>In progress</span>
                )}
              </div>

              {/* Connector */}
              <div className="flex-1 h-px mt-4 opacity-60" style={{ background: ["approved","rejected"].includes(mission.status) ? (mission.status === "approved" ? "linear-gradient(to right, #0066FF, #00C896)" : "linear-gradient(to right, #0066FF, #FF3B5C)") : "rgba(255,255,255,0.1)" }} />

              {/* Step 4 — Decision */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{
                  border: `2px solid ${mission.status === "approved" ? "#00C896" : mission.status === "rejected" ? "#FF3B5C" : "rgba(255,255,255,0.1)"}`,
                  background: mission.status === "approved" ? "rgba(0,200,150,0.08)" : mission.status === "rejected" ? "rgba(255,59,92,0.08)" : "rgba(255,255,255,0.03)",
                }}>
                  {mission.status === "approved" ? (
                    <CheckCircle2 className="w-4 h-4" style={{ color: "#00C896" }} />
                  ) : mission.status === "rejected" ? (
                    <XCircle className="w-4 h-4" style={{ color: "#FF3B5C" }} />
                  ) : (
                    <span className="text-[10px] font-bold font-mono" style={{ color: "rgba(240,244,255,0.2)" }}>4</span>
                  )}
                </div>
                <span className="text-[10px] font-mono mt-1.5 uppercase tracking-wide" style={{ color: mission.status === "approved" ? "#00C896" : mission.status === "rejected" ? "#FF3B5C" : "rgba(240,244,255,0.35)" }}>
                  {mission.status === "approved" ? "Approved" : mission.status === "rejected" ? "Rejected" : "Decision"}
                </span>
                {mission.reviewed_at && (
                  <span className="text-[10px] font-mono mt-0.5 max-w-22 text-center leading-tight" style={{ color: mission.status === "approved" ? "rgba(0,200,150,0.6)" : "rgba(255,59,92,0.6)" }}>
                    {new Date(mission.reviewed_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono" style={{ color: "rgba(240,244,255,0.35)" }}>Status</span>
                <StatusBadge status={mission.status} />
              </div>
              {reviewerName && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono" style={{ color: "rgba(240,244,255,0.35)" }}>Reviewed by</span>
                  <span className="text-[11px] font-mono" style={{ color: "#F0F4FF" }}>{reviewerName}</span>
                </div>
              )}
              {mission.officer_notes && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono" style={{ color: "rgba(240,244,255,0.35)" }}>Notes</span>
                  <span className="text-[11px] italic" style={{ color: "rgba(240,244,255,0.6)" }}>{mission.officer_notes}</span>
                </div>
              )}
            </div>
          </SectionCard>
        </div>

      </div>
    </div>
  );
}