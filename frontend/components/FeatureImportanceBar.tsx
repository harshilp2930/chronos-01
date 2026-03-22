"use client";

import { motion } from "framer-motion";

type FeatureTier = "critical" | "high" | "medium" | "low";

type FeatureItem = {
  key: string;
  label: string;
  value: number;
  pct: number;
  tier: FeatureTier;
};

const features: FeatureItem[] = [
  { key: "precipitation_mm_h", label: "Precipitation", value: 0.287, pct: 100, tier: "critical" },
  { key: "lightning_distance_km", label: "Lightning Distance", value: 0.241, pct: 84, tier: "critical" },
  { key: "visibility_km", label: "Visibility", value: 0.198, pct: 69, tier: "high" },
  { key: "wind_gust_kmh", label: "Wind Gust", value: 0.162, pct: 56, tier: "high" },
  { key: "cloud_ceiling_ft", label: "Cloud Ceiling", value: 0.142, pct: 49, tier: "medium" },
  { key: "wind_speed_kmh", label: "Wind Speed", value: 0.118, pct: 41, tier: "medium" },
  { key: "humidity_pct", label: "Humidity", value: 0.087, pct: 30, tier: "low" },
  { key: "temperature_c", label: "Temperature", value: 0.058, pct: 20, tier: "low" },
];

const tierColors: Record<FeatureTier, { bar: string; text: string; label: string }> = {
  critical: { bar: "from-amber-500 to-red-500", text: "#f59e0b", label: "CRITICAL" },
  high: { bar: "from-blue-500 to-cyan-400", text: "#4f8ef7", label: "HIGH" },
  medium: { bar: "from-blue-600 to-blue-400", text: "#60a5fa", label: "MEDIUM" },
  low: { bar: "from-slate-600 to-slate-500", text: "#64748b", label: "LOW" },
};

export default function FeatureImportanceBar() {
  return (
    <div className="mt-4">
      <div className="mb-6 flex items-center gap-4 text-[11px] font-mono">
        <span className="text-slate-500">IMPORTANCE TIER:</span>
        {(Object.entries(tierColors) as [FeatureTier, (typeof tierColors)[FeatureTier]][])
          .reverse()
          .map(([tier, { text, label }]) => (
            <span key={tier} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: text }} />
              <span style={{ color: text }}>{label}</span>
            </span>
          ))}
      </div>

      <div className="flex flex-col gap-4">
        {features.map((feature, index) => (
          <motion.div
            key={feature.key}
            className="group"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.07, duration: 0.5 }}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">{feature.label}</span>
                <span
                  className="rounded px-1.5 py-0.5 text-[9px] font-mono"
                  style={{
                    color: tierColors[feature.tier].text,
                    background: `${tierColors[feature.tier].text}15`,
                    border: `1px solid ${tierColors[feature.tier].text}30`,
                  }}
                >
                  {tierColors[feature.tier].label}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-500">Gini</span>
                <span className="text-sm font-bold font-mono" style={{ color: tierColors[feature.tier].text }}>
                  {feature.value.toFixed(3)}
                </span>
              </div>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-space-700">
              <motion.div
                className={`h-full rounded-full bg-linear-to-r ${tierColors[feature.tier].bar}`}
                initial={{ width: "0%" }}
                whileInView={{ width: `${feature.pct}%` }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.07 + 0.2, duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
