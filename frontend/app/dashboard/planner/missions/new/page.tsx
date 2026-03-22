"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Rocket,
  Shield,
  CalendarRange,
  ClipboardList,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { NoisePatternCard } from "@/components/ui/card-with-noise-patter";
import { SafetyCanvas } from "@/components/planner/safety-canvas";
import { WeatherGauge } from "@/components/planner/weather-gauge";

// ── Helpers ──────────────────────────────────────────────────────────────────

const VEHICLE_TO_SAFETY: Record<string, string> = {
  sounding: "light",
  sslv:     "light",
  pslv:     "medium",
  gslv2:    "heavy",
  lvm3:     "superheavy",
};

const INPUT_CLS =
  "w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/60";
const SELECT_CLS =
  "w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/60";
const LABEL_CLS = "block text-xs text-slate-400 mb-1.5 font-medium";

// ── Wizard state type ─────────────────────────────────────────────────────────

interface WizardData {
  // Step 1
  title:         string;
  target_body:   string;
  launch_pad_id: string;
  vehicle_class: string;
  orbit_type:    string;
  // Step 2
  safety_buffer:     number;
  azimuth_deg:       string;
  corridor_width_km: string;
  downrange_km:      string;
  // Step 3
  earliest_date: string;
  latest_date:   string;
  launch_date:   string;
  // Computed
  safetyData:     unknown;
  windows:        LaunchWindow[];
  selectedWindow: LaunchWindow | null;
  weatherData:    WeatherResult | null;
}

interface LaunchWindow {
  rank: number;
  launch_date: string;
  arrival_date: string;
  tof_days: number;
  total_delta_v_km_s: number;
  launch_jd: number;
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

// ── Step icons ────────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Basics",       short: "1", icon: Rocket        },
  { label: "Safety Zones", short: "2", icon: Shield        },
  { label: "Launch Window",short: "3", icon: CalendarRange },
  { label: "Review",       short: "4", icon: ClipboardList },
] as const;

// ── Step 1: Mission basics ────────────────────────────────────────────────────

function Step1({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (k: keyof WizardData, v: unknown) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className={LABEL_CLS}>Mission Title *</label>
        <input
          type="text"
          className={INPUT_CLS}
          placeholder="e.g. PSLV-C61 Polar LEO Insertion"
          value={data.title}
          onChange={(e) => onChange("title", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL_CLS}>Target Body *</label>
          <select
            className={SELECT_CLS}
            value={data.target_body}
            onChange={(e) => onChange("target_body", e.target.value)}
          >
            <option value="" className="bg-[#0a0f1e]">Select target…</option>
            <option value="moon"  className="bg-[#0a0f1e]">Moon</option>
            <option value="mars"  className="bg-[#0a0f1e]">Mars</option>
            <option value="venus" className="bg-[#0a0f1e]">Venus</option>
          </select>
        </div>

        <div>
          <label className={LABEL_CLS}>Launch Pad *</label>
          <select
            className={SELECT_CLS}
            value={data.launch_pad_id}
            onChange={(e) => onChange("launch_pad_id", e.target.value)}
          >
            <option value="" className="bg-[#0a0f1e]">Select pad…</option>
            <option value="sdsc" className="bg-[#0a0f1e]">SDSC — Sriharikota</option>
            <option value="vssc" className="bg-[#0a0f1e]">VSSC — Thiruvananthapuram</option>
            <option value="aki"  className="bg-[#0a0f1e]">AKI — Abdul Kalam Island</option>
          </select>
        </div>

        <div>
          <label className={LABEL_CLS}>Vehicle Class *</label>
          <select
            className={SELECT_CLS}
            value={data.vehicle_class}
            onChange={(e) => onChange("vehicle_class", e.target.value)}
          >
            <option value=""         className="bg-[#0a0f1e]">Select vehicle…</option>
            <option value="sounding" className="bg-[#0a0f1e]">Sounding Rocket</option>
            <option value="sslv"     className="bg-[#0a0f1e]">SSLV</option>
            <option value="pslv"     className="bg-[#0a0f1e]">PSLV</option>
            <option value="gslv2"    className="bg-[#0a0f1e]">GSLV Mk II</option>
            <option value="lvm3"     className="bg-[#0a0f1e]">LVM3</option>
          </select>
        </div>

        <div>
          <label className={LABEL_CLS}>Orbit Type</label>
          <select
            className={SELECT_CLS}
            value={data.orbit_type}
            onChange={(e) => onChange("orbit_type", e.target.value)}
          >
            <option value=""    className="bg-[#0a0f1e]">Select orbit…</option>
            <option value="leo" className="bg-[#0a0f1e]">LEO</option>
            <option value="sso" className="bg-[#0a0f1e]">SSO</option>
            <option value="geo" className="bg-[#0a0f1e]">GEO</option>
            <option value="sub" className="bg-[#0a0f1e]">Sub-orbital</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Safety zones ──────────────────────────────────────────────────────

function Step2({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (k: keyof WizardData, v: unknown) => void;
}) {
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced fetch safety zones
  useEffect(() => {
    if (!data.launch_pad_id || !data.vehicle_class) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data: res } = await api.post("/api/safety/calculate", {
          pad_id:            data.launch_pad_id,
          vehicle_class:     VEHICLE_TO_SAFETY[data.vehicle_class] ?? "medium",
          wind_speed_kmh:    12,
          wind_direction_deg: parseFloat(data.azimuth_deg) || 90,
          launch_azimuth_deg: data.azimuth_deg ? parseFloat(data.azimuth_deg) : null,
        });
        onChange("safetyData", res);
      } catch {
        /* silently skip */
      } finally {
        setLoading(false);
      }
    }, 600);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.launch_pad_id, data.vehicle_class, data.azimuth_deg, data.safety_buffer]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Left: controls */}
        <div className="space-y-4">
          <div>
            <label className={LABEL_CLS}>
              Safety Buffer: <span className="text-cyan-400 font-mono">{data.safety_buffer.toFixed(1)}×</span>
            </label>
            <input
              type="range"
              min={1.0}
              max={2.0}
              step={0.1}
              value={data.safety_buffer}
              onChange={(e) => onChange("safety_buffer", parseFloat(e.target.value))}
              className="w-full accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-slate-600">
              <span>1.0× minimum</span>
              <span>2.0× maximum</span>
            </div>
          </div>

          <div>
            <label className={LABEL_CLS}>Launch Azimuth (°)</label>
            <input
              type="number"
              className={INPUT_CLS}
              placeholder="0 – 360"
              min={0}
              max={359}
              value={data.azimuth_deg}
              onChange={(e) => onChange("azimuth_deg", e.target.value)}
            />
            <p className="text-[10px] text-slate-600 mt-1">
              0 = North, 90 = East. Enables trajectory corridor.
            </p>
          </div>

          <div>
            <label className={LABEL_CLS}>Corridor Width (km)</label>
            <input
              type="number"
              className={INPUT_CLS}
              placeholder="e.g. 40"
              min={5}
              max={200}
              value={data.corridor_width_km}
              onChange={(e) => onChange("corridor_width_km", e.target.value)}
            />
          </div>

          <div>
            <label className={LABEL_CLS}>Downrange Distance (km)</label>
            <input
              type="number"
              className={INPUT_CLS}
              placeholder="e.g. 500"
              min={50}
              max={5000}
              value={data.downrange_km}
              onChange={(e) => onChange("downrange_km", e.target.value)}
            />
          </div>

          <div className="p-3 rounded-lg border border-white/10 bg-white/3 text-xs text-slate-500 font-mono space-y-0.5">
            <p>Pad:     <span className="text-white">{data.launch_pad_id.toUpperCase() || "—"}</span></p>
            <p>Vehicle: <span className="text-white">{(VEHICLE_TO_SAFETY[data.vehicle_class] ?? "—").toUpperCase()}</span></p>
            <p>Buffer:  <span className="text-cyan-400">{data.safety_buffer.toFixed(1)}×</span></p>
          </div>
        </div>

        {/* Right: canvas */}
        <div>
          <label className={LABEL_CLS}>Safety Zone Preview</label>
          <SafetyCanvas
            data={data.safetyData as never}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Launch window ─────────────────────────────────────────────────────

function Step3({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (k: keyof WizardData, v: unknown) => void;
}) {
  const [searching,       setSearching]       = useState(false);
  const [weatherLoading,  setWeatherLoading]  = useState(false);
  const [searchError,     setSearchError]     = useState("");

  const handleSearch = async () => {
    if (!data.earliest_date || !data.latest_date) {
      setSearchError("Please set both earliest and latest dates.");
      return;
    }
    setSearchError("");
    setSearching(true);
    try {
      const { data: res } = await api.post("/api/optimization/launch-window", {
        target:         data.target_body,
        earliest_date:  data.earliest_date,
        latest_date:    data.latest_date,
        population_size: 60,
        generations:     80,
      });
      onChange("windows", res.top_windows ?? []);
      if (res.top_windows?.[0]) {
        selectWindow(res.top_windows[0], onChange, data.launch_pad_id, setWeatherLoading, (w) => onChange("weatherData", w));
        onChange("launch_date", res.top_windows[0].launch_date);
        onChange("selectedWindow", res.top_windows[0]);
      }
    } catch {
      setSearchError("Optimization failed. Try a broader date range.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Date range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL_CLS}>Earliest Launch Date *</label>
          <input
            type="date"
            className={INPUT_CLS}
            value={data.earliest_date}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => onChange("earliest_date", e.target.value)}
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Latest Launch Date *</label>
          <input
            type="date"
            className={INPUT_CLS}
            value={data.latest_date}
            min={data.earliest_date || new Date().toISOString().split("T")[0]}
            onChange={(e) => onChange("latest_date", e.target.value)}
          />
        </div>
      </div>

      <Button
        onClick={handleSearch}
        disabled={searching || !data.earliest_date || !data.latest_date}
        className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold gap-2"
      >
        {searching ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Running GA optimiser…</>
        ) : (
          <><CalendarRange className="w-4 h-4" /> Find Optimal Windows</>
        )}
      </Button>

      {searchError && (
        <p className="text-sm text-red-400">{searchError}</p>
      )}

      {/* Top windows */}
      {data.windows.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 font-medium">
            Top {Math.min(data.windows.length, 3)} launch windows — click to select:
          </p>
          {data.windows.slice(0, 3).map((w) => {
            const isSelected = data.selectedWindow?.rank === w.rank;
            return (
              <button
                key={w.rank}
                onClick={() => {
                  onChange("launch_date",     w.launch_date);
                  onChange("selectedWindow",  w);
                  selectWindow(w, onChange, data.launch_pad_id, setWeatherLoading, (wd) => onChange("weatherData", wd));
                }}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                  isSelected
                    ? "border-cyan-500/60 bg-cyan-500/10"
                    : "border-white/10 bg-white/2 hover:bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                      isSelected ? "bg-cyan-500 text-black" : "bg-white/10 text-slate-400"
                    }`}>
                      #{w.rank}
                    </span>
                    <span className="text-sm text-white font-medium">{w.launch_date}</span>
                    <span className="text-xs text-slate-500 hidden sm:inline">
                      → {w.arrival_date} ({w.tof_days}d)
                    </span>
                  </div>
                  <span className="text-sm font-mono text-cyan-400">
                    ΔV {w.total_delta_v_km_s.toFixed(3)} km/s
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Weather gauge */}
      {(weatherLoading || data.weatherData) && (
        <div className="mt-4">
          <p className="text-xs text-slate-500 font-medium mb-3">
            Weather Risk — {data.launch_date}
          </p>
          {weatherLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Fetching weather risk…
            </div>
          ) : data.weatherData ? (
            <div className="max-w-xs">
              <WeatherGauge
                probability={data.weatherData.scrub_probability}
                riskLevel={data.weatherData.risk_level}
                goNoGo={data.weatherData.go_no_go}
                factors={data.weatherData.factors}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/** Fire-and-forget helper to fetch weather for a given window date */

/**
 * Generate physically-realistic weather params from launch date + pad.
 * Uses India monsoon seasonality (SW monsoon Jun–Sep, NE monsoon Oct–Nov).
 * Deterministic: same date+pad always gives the same values.
 */
function weatherForDateAndPad(launchDate: string, padId: string) {
  const d     = new Date(launchDate);
  const month = d.getMonth() + 1;        // 1–12
  const doy   = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000);
  const padOff = padId === "vssc" ? 1000 : padId === "aki" ? 2000 : 0;
  // Deterministic LCG-like noise seeded from doy + pad
  const r = (n: number) => Math.abs(Math.sin((doy + padOff) * 9973 + n * 1031) % 1);

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

  return { wind_speed_kmh: windSpeed, wind_gust_kmh: windGust, visibility_km: visibility,
    cloud_ceiling_ft: cloudCeilFt, temperature_c: temp, precipitation_mm_h: precip,
    lightning_distance_km: lightning, humidity_pct: +humidity };
}

async function selectWindow(
  w: LaunchWindow,
  onChange: (k: keyof WizardData, v: unknown) => void,
  padId: string,
  setLoading: (v: boolean) => void,
  onData: (wd: WeatherResult) => void,
) {
  setLoading(true);
  try {
    const wx = weatherForDateAndPad(w.launch_date, padId || "sdsc");
    const { data } = await api.post<ScrubApiResponse>("/api/v1/scrub/predict", {
      site_id: padId || "sdsc",
      ...wx,
    });
    onData({
      scrub_probability: data.scrub_probability / 100,
      risk_level: data.risk_level.toLowerCase(),
      go_no_go: data.go_no_go,
      factors: undefined,
    });
  } catch {/* ignore */} finally {
    setLoading(false);
  }
  void onChange; // suppress unused-var warning
}

// ── Step 4: Review + Submit ───────────────────────────────────────────────────

function Step4({
  data,
}: {
  data: WizardData;
}) {
  const rows: [string, string][] = [
    ["Title",        data.title],
    ["Target Body",  data.target_body.toUpperCase()],
    ["Launch Pad",   data.launch_pad_id.toUpperCase()],
    ["Vehicle",      data.vehicle_class.toUpperCase()],
    ["Orbit",        data.orbit_type ? data.orbit_type.toUpperCase() : "—"],
    ["Safety Buffer",`${data.safety_buffer.toFixed(1)}×`],
    ["Azimuth",      data.azimuth_deg ? `${data.azimuth_deg}°` : "—"],
    ["Corridor Width",data.corridor_width_km ? `${data.corridor_width_km} km` : "—"],
    ["Downrange",    data.downrange_km ? `${data.downrange_km} km` : "—"],
    ["Launch Date",  data.launch_date || "—"],
    ["ΔV",           data.selectedWindow ? `${data.selectedWindow.total_delta_v_km_s.toFixed(3)} km/s` : "—"],
    ["Scrub Risk",   data.weatherData ? `${Math.round(data.weatherData.scrub_probability * 100)}%` : "—"],
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/2 overflow-hidden">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-white/4">
            {rows.map(([label, value]) => (
              <tr key={label}>
                <td className="px-4 py-2.5 text-slate-500 w-36 text-xs font-medium">{label}</td>
                <td className="px-4 py-2.5 text-white font-mono text-xs">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.weatherData && (
        <div className={`px-4 py-2.5 rounded-xl border text-sm font-medium ${
          data.weatherData.go_no_go === "GO"
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            : "border-red-500/30 bg-red-500/10 text-red-400"
        }`}>
          Weather call: {data.weatherData.go_no_go} — {data.weatherData.risk_level} risk
        </div>
      )}
    </div>
  );
}

// ── Main wizard page ──────────────────────────────────────────────────────────

const INITIAL: WizardData = {
  title:         "",
  target_body:   "",
  launch_pad_id: "",
  vehicle_class: "",
  orbit_type:    "",
  safety_buffer: 1.2,
  azimuth_deg:   "",
  corridor_width_km: "",
  downrange_km:      "",
  earliest_date: "",
  latest_date:   "",
  launch_date:   "",
  safetyData:    null,
  windows:       [],
  selectedWindow: null,
  weatherData:    null,
};

function canAdvance(step: number, data: WizardData): boolean {
  if (step === 0) return !!(data.title && data.target_body && data.launch_pad_id && data.vehicle_class);
  if (step === 1) return true; // safety is optional
  if (step === 2) return !!data.launch_date;
  return true;
}

export default function NewMissionPage() {
  const { user }  = useAuthStore();
  const router    = useRouter();
  const [step,    setStep]    = useState(0);
  const [data,    setData]    = useState<WizardData>(INITIAL);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    if (!user) router.push("/auth/login");
  }, [user, router]);

  const onChange = (k: keyof WizardData, v: unknown) =>
    setData((d) => ({ ...d, [k]: v }));

  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        title:             data.title,
        target_body:       data.target_body,
        launch_pad_id:     data.launch_pad_id,
        vehicle_class:     data.vehicle_class,
        orbit_type:        data.orbit_type || null,
        launch_date:       data.launch_date || null,
        safety_buffer:     data.safety_buffer,
        azimuth_deg:       data.azimuth_deg ? parseFloat(data.azimuth_deg) : null,
        corridor_width_km: data.corridor_width_km ? parseFloat(data.corridor_width_km) : null,
        downrange_km:      data.downrange_km ? parseFloat(data.downrange_km) : null,
      };

      const { data: mission } = await api.post("/api/missions/", payload);

      // Patch delta_v while still in draft status
      if (data.selectedWindow) {
        await api.put(`/api/missions/${mission.id}`, {
          delta_v_km_s: data.selectedWindow.total_delta_v_km_s,
          scrub_risk_score: data.weatherData?.scrub_probability ?? null,
        });
      }

      // Planners submit for approval; individuals save as draft
      if (user?.role === "planner") {
        await api.post(`/api/missions/${mission.id}/submit`);
      }

      router.push(`/dashboard/planner/missions/${mission.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail ?? "Failed to create mission";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    <Step1 key={0} data={data} onChange={onChange} />,
    <Step2 key={1} data={data} onChange={onChange} />,
    <Step3 key={2} data={data} onChange={onChange} />,
    <Step4 key={3} data={data} />,
  ];

  const isLast = step === steps.length - 1;

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-bold text-white">New Mission</h1>
        <p className="text-slate-400 text-sm mt-1">
          Complete all steps to plan and submit your mission.
        </p>
      </div>

      {/* ── Progress indicator ── */}
      <div className="flex items-center">
        {STEPS.map(({ label, icon: Icon }, i) => {
          const done    = i < step;
          const current = i === step;
          return (
            <div key={i} className="flex-1 flex items-center">
              <div className="flex flex-col items-center">
                <button
                  onClick={() => done && setStep(i)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                    done
                      ? "border-cyan-500 bg-cyan-500 cursor-pointer"
                      : current
                      ? "border-cyan-500 bg-cyan-500/20"
                      : "border-white/20 bg-transparent cursor-default"
                  }`}
                >
                  {done ? (
                    <Check className="w-4 h-4 text-black" />
                  ) : (
                    <Icon className={`w-4 h-4 ${current ? "text-cyan-400" : "text-slate-600"}`} />
                  )}
                </button>
                <span
                  className={`text-[10px] mt-1 font-medium hidden sm:block ${
                    current ? "text-cyan-400" : done ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-px mx-2 transition-colors ${
                    i < step ? "bg-cyan-500/60" : "bg-white/10"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Step content ── */}
      <NoisePatternCard>
        <div className="rounded-xl p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              {(() => {
                const S = STEPS[step];
                return <><S.icon className="w-4 h-4 text-cyan-400" /> Step {step + 1}: {S.label}</>;
              })()}
            </h2>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22 }}
            >
              {steps[step]}
            </motion.div>
          </AnimatePresence>
        </div>
      </NoisePatternCard>

      {/* ── Error ── */}
      {error && (
        <div className="px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ── Nav buttons ── */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className="border-white/20 text-slate-300 hover:text-white bg-transparent"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        {isLast ? (
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold gap-2"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            ) : user?.role === "planner" ? (
              <><Check className="w-4 h-4" /> Submit for Approval</>
            ) : (
              <><Check className="w-4 h-4" /> Save Mission</>
            )}
          </Button>
        ) : (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance(step, data)}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold gap-2 disabled:opacity-40"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
