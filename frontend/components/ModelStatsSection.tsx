"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Activity, Target, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CountUpNumber } from "@/components/stats/CountUpNumber";
import FeatureImportanceBar from "@/components/FeatureImportanceBar";

type Stat = {
  label: string;
  value: number;
  suffix: string;
  color: string;
  glow: string;
  desc: string;
  prefix?: string;
  icon: LucideIcon;
};

const stats: Stat[] = [
  {
    icon: CheckCircle2,
    value: 95.01,
    suffix: "%",
    label: "Test Accuracy",
    desc: "Correct on unseen data",
    color: "#22c55e",
    glow: "rgba(34,197,94,0.12)",
  },
  {
    icon: Activity,
    value: 0.9551,
    suffix: "",
    label: "ROC-AUC Score",
    desc: "Near-perfect separation",
    color: "#4f8ef7",
    glow: "rgba(79,142,247,0.12)",
  },
  {
    icon: Target,
    value: 0.955,
    suffix: "",
    label: "Avg Precision",
    desc: "Precision-recall balance",
    color: "#06b6d4",
    glow: "rgba(6,182,212,0.12)",
  },
  {
    icon: Shield,
    value: 0.008,
    suffix: "",
    label: "CV Stability",
    prefix: "±",
    desc: "5-fold cross-validation std",
    color: "#a855f7",
    glow: "rgba(168,85,247,0.12)",
  },
];

export default function ModelStatsSection() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  return (
    <section id="model" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mb-8">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-left font-space text-4xl font-bold leading-[1.08] tracking-tight text-white md:text-5xl"
        >
          Model Performance
        </motion.h2>
        <p className="mt-3 max-w-3xl text-left leading-relaxed text-slate-300">Validated on held-out test data — not training data</p>
      </div>

      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            className="group relative overflow-hidden rounded-2xl border border-space-600 bg-space-800/60 p-6 backdrop-blur-sm"
            style={{
              transition: "border-color 0.3s, box-shadow 0.3s",
              borderColor: hoveredCard === i ? stat.color : undefined,
              boxShadow: hoveredCard === i ? `0 0 40px ${stat.glow}, 0 0 80px ${stat.glow}` : "none",
            }}
            onMouseEnter={() => setHoveredCard(i)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div
              className="absolute top-0 left-0 right-0 h-0.75 rounded-t-2xl"
              style={{ background: `linear-gradient(90deg, ${stat.color}, ${stat.color}40)` }}
            />

            <div
              className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
              style={{ background: stat.glow }}
            />

            <div
              className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ background: stat.glow, border: `1px solid ${stat.color}30` }}
            >
              <stat.icon size={18} style={{ color: stat.color }} />
            </div>

            <div className="mb-1 flex items-baseline gap-1">
              {stat.prefix && (
                <span className="font-space text-3xl font-black" style={{ color: stat.color }}>
                  {stat.prefix}
                </span>
              )}

              <CountUpNumber
                target={stat.value}
                decimals={stat.label === "Test Accuracy" ? 2 : 4}
                className="font-space text-4xl font-black"
                style={{ color: stat.color }}
              />

              {stat.suffix && (
                <span className="font-space text-3xl font-black" style={{ color: stat.color }}>
                  {stat.suffix}
                </span>
              )}
            </div>

            <p className="mb-1 text-sm font-medium text-white">{stat.label}</p>
            <p className="text-xs text-slate-500">{stat.desc}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-[#122038] bg-[#0d1526] p-6">
        <h3 className="text-lg font-semibold text-white">Feature Importance</h3>
        <FeatureImportanceBar />
      </div>
    </section>
  );
}
