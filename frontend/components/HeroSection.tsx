"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import SolarSystemCanvas from "@/components/SolarSystemCanvas";

const words = ["Predict.", "Assess.", "Launch", "with", "Confidence."];
const EarthCanvas = dynamic(() => import("@/components/hero/EarthCanvas"), { ssr: false });

export default function HeroSection() {
  return (
    <section id="home" className="relative flex min-h-screen items-start overflow-hidden pt-12">
      <SolarSystemCanvas />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(79,142,247,0.14),transparent_45%)]" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center rounded-full border border-[#4f8ef7]/60 bg-[#4f8ef7]/10 px-3 py-1 text-xs text-cyan-200 [box-shadow:0_0_20px_rgba(79,142,247,0.24)]"
            >
              🛰️ AI-Powered Launch Intelligence
            </motion.div>

            <h1 className="mt-6 font-space text-4xl font-black leading-tight text-white md:text-6xl">
              <span className="block">
                {words.slice(0, 2).map((w, i) => (
                  <motion.span
                    key={w}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.45 }}
                    className="mr-3 inline-block will-change-transform"
                  >
                    {w}
                  </motion.span>
                ))}
              </span>
              <span className="mt-1 block bg-linear-to-r from-[#4f8ef7] to-[#06b6d4] bg-clip-text text-transparent">
                {words.slice(2).join(" ")}
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="mt-6 max-w-xl text-base leading-relaxed text-slate-300"
            >
              Chronos-1 uses a hybrid Random Forest model trained on real Indian coastal weather
              patterns to predict ISRO launch scrub probability in real time.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 rounded-xl bg-[#4f8ef7] px-5 py-3 font-semibold text-white transition hover:scale-[1.02] hover:[box-shadow:0_0_28px_rgba(79,142,247,0.5)]"
              >
                Check Launch Status <ChevronRight className="h-4 w-4" />
              </Link>
              <a
                href="#model"
                className="inline-flex items-center rounded-xl border border-[#122038] bg-[#0d1526]/80 px-5 py-3 font-semibold text-slate-200 transition hover:border-[#4f8ef7]"
              >
                View Model Report
              </a>
            </motion.div>

            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
              {[
                { label: "Accuracy", value: "95.01%" },
                { label: "ROC-AUC", value: "0.9551" },
                { label: "Launch Sites", value: "3" },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.75 + i * 0.1, duration: 0.35 }}
                  className="rounded-xl border border-[#122038] bg-[#0d1526]/80 p-3"
                >
                  <p className="text-xs text-slate-400">{s.label}</p>
                  <p className="mt-1 text-xl font-bold text-white">{s.value}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="relative flex h-125 w-full items-center justify-center md:h-auto md:min-h-125">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-80 w-80 rounded-full bg-neon-blue/8 blur-[80px]" />
            </div>

            <div className="relative h-120 w-120">
              <EarthCanvas />
            </div>

            <div className="absolute top-16 right-8 flex items-center gap-2">
              <div className="text-right">
                <p className="font-mono text-[10px] tracking-widest text-neon-cyan">ISS ORBIT</p>
                <p className="text-xs text-slate-400">408 km · 51.6°</p>
              </div>
              <div className="h-px w-8 bg-neon-cyan/50" />
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon-cyan" />
            </div>

            <div className="absolute bottom-16 left-8 flex items-center gap-2">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon-green" />
              <div className="h-px w-8 bg-neon-green/50" />
              <div>
                <p className="font-mono text-[10px] tracking-widest text-neon-green">SDSC</p>
                <p className="text-xs text-slate-400">13.7°N · 80.2°E</p>
              </div>
            </div>

            <div className="absolute top-1/2 right-4 -translate-y-1/2">
              <div className="flex flex-col items-center gap-1">
                <div className="h-12 w-px bg-linear-to-b from-transparent to-neon-blue/40" />
                <p className="mt-1 rotate-90 whitespace-nowrap font-mono text-[9px] tracking-[0.2em] text-slate-500">
                  ISRO MISSION ZONE
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
