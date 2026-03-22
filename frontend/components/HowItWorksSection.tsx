"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { Cloud, Brain, Rocket } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Weather Ingestion",
    icon: Cloud,
    description:
      "Real-time data fetched from Open-Meteo API for SDSC, VSSC, and Abdul Kalam Island. 8 parameters: wind, gusts, visibility, ceiling, temperature, precipitation, lightning, humidity.",
    accent: "#06b6d4",
    glow: "rgba(6,182,212,0.15)",
    detail: "8 parameters · 3 sites · hourly updates",
  },
  {
    number: "02",
    title: "ML Risk Assessment",
    icon: Brain,
    description:
      "250 Random Forest trees evaluate features against ISRO LWCC thresholds. Trained on 6,000+ samples with real Indian coastal monsoon seasonality.",
    accent: "#4f8ef7",
    glow: "rgba(79,142,247,0.15)",
    detail: "250 trees · 6,000+ samples · LWCC rules",
  },
  {
    number: "03",
    title: "GO / NO-GO Decision",
    icon: Rocket,
    description:
      "Scrub probability computed in <50ms. Hard LWCC violations trigger automatic NO-GO override. Violation breakdown returned with the decision.",
    accent: "#22c55e",
    glow: "rgba(34,197,94,0.15)",
    detail: "<50ms latency · REST API · violation detail",
  },
];

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 80%", "end 20%"],
  });
  const lineProgressRaw = useTransform(scrollYProgress, [0, 1], [1000, 0]);
  const lineProgress = useSpring(lineProgressRaw, { stiffness: 120, damping: 26 });

  const titleWords = ["How", "Chronos-1", "Works"];

  return (
    <section id="how-it-works" ref={sectionRef} className="mx-auto max-w-7xl px-6 py-24">
      <div className="mb-4">
        <h2 className="flex flex-wrap items-baseline gap-x-3 gap-y-2 text-left font-space text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl">
          {titleWords.map((word, index) => (
            <motion.span
              key={word}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className={word === "Chronos-1" ? "inline-block text-neon-blue" : "inline-block text-white"}
            >
              {word}
            </motion.span>
          ))}
        </h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-3 max-w-3xl text-left leading-relaxed text-slate-400"
        >
          From raw weather to launch decision in milliseconds
        </motion.p>
      </div>

      <div className="relative mt-0 mb-0 w-full">
        <motion.svg width="100%" height="8" className="overflow-visible" viewBox="0 0 100 8" preserveAspectRatio="none">
          <motion.path
            d="M 5 4 C 20 4, 25 4, 33 4 M 33 4 C 41 4, 46 4, 50 4 M 50 4 C 58 4, 63 4, 66 4 M 66 4 C 74 4, 79 4, 95 4"
            fill="none"
            stroke="url(#lineGrad)"
            strokeWidth="1.5"
            strokeDasharray="1000"
            style={{ strokeDashoffset: lineProgress }}
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
              <stop offset="30%" stopColor="#06b6d4" stopOpacity="1" />
              <stop offset="70%" stopColor="#4f8ef7" stopOpacity="1" />
              <stop offset="100%" stopColor="#4f8ef7" stopOpacity="0" />
            </linearGradient>
          </defs>
        </motion.svg>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {steps.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -8, transition: { duration: 0.2 } }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            className="group relative flex-1 cursor-default overflow-hidden rounded-2xl border border-space-600 bg-space-800/60 p-6 backdrop-blur-sm"
            style={{
              boxShadow: hoveredIndex === i ? `0 20px 60px ${s.glow}` : "none",
              borderColor: hoveredIndex === i ? s.accent : undefined,
              transition: "border-color 0.3s, box-shadow 0.3s",
            }}
          >
            <span className="pointer-events-none absolute top-4 right-5 select-none font-space text-5xl font-black text-white/4">
              {s.number}
            </span>

            <motion.div
              className="absolute top-0 left-0 h-0.5 rounded-t-2xl"
              style={{
                background: `linear-gradient(90deg, ${s.accent}, transparent)`,
                width: hoveredIndex === i ? "100%" : "0%",
              }}
              transition={{ duration: 0.4 }}
            />

            <motion.div
              className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ background: s.glow, border: `1px solid ${s.accent}30` }}
              animate={hoveredIndex === i ? { rotate: [0, -10, 10, 0] } : { rotate: 0 }}
              transition={{ duration: 0.4 }}
            >
              <s.icon size={22} style={{ color: s.accent }} />
            </motion.div>

            <p className="mb-1 text-[10px] font-mono tracking-[0.2em]" style={{ color: s.accent }}>
              STEP {s.number}
            </p>
            <h3 className="mb-3 font-space text-xl font-bold text-white">{s.title}</h3>
            <p className="mb-5 text-sm leading-relaxed text-slate-400">{s.description}</p>

            <div
              className="inline-flex items-center gap-1.5 rounded-full border border-space-600 bg-space-900 px-3 py-1 text-[11px] font-mono"
              style={{ color: s.accent }}
            >
              <span className="h-1 w-1 animate-pulse rounded-full" style={{ background: s.accent }} />
              {s.detail}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
