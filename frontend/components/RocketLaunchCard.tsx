"use client";

import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import RocketParticles from "@/components/RocketParticles";

type Site = "sdsc" | "vssc" | "aki";

type Phase =
  | "assembling"
  | "scanning"
  | "countdown"
  | "launching"
  | "launched"
  | "hold"
  | "error";

type PredictionResult = {
  scrub_probability: number;
  risk_level: string;
  go_no_go: string;
  lwcc_violations?: string[];
};

const rocketVariants: Variants = {
  hidden: { opacity: 0 },
  assembled: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  hovering: { y: [0, -4, 0], transition: { repeat: Infinity, duration: 2, ease: "easeInOut" } },
  launching: { y: -1200, transition: { duration: 1.8, ease: [0.2, 0, 1, 1] } },
  shaking: { x: [-10, 10, -10, 10, 0], transition: { duration: 0.5 } },
};

const noseVariants: Variants = {
  hidden: { y: -200, opacity: 0 },
  assembled: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 200, damping: 15, delay: 0.0 },
  },
};

const bodyVariants: Variants = {
  hidden: { y: -150, opacity: 0 },
  assembled: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 180, damping: 14, delay: 0.3 },
  },
};

const engineVariants: Variants = {
  hidden: { y: 150, opacity: 0 },
  assembled: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 160, damping: 13, delay: 0.6 },
  },
};

const boosterLeftVariants: Variants = {
  hidden: { x: -150, rotate: -90, opacity: 0 },
  assembled: {
    x: 0,
    rotate: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 140, damping: 12, delay: 0.9 },
  },
  separating: { x: -150, rotate: -45, opacity: 0, transition: { delay: 0.9, duration: 0.6, ease: "easeIn" } },
};

const boosterRightVariants: Variants = {
  hidden: { x: 150, rotate: 90, opacity: 0 },
  assembled: {
    x: 0,
    rotate: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 140, damping: 12, delay: 1.1 },
  },
  separating: { x: 150, rotate: 45, opacity: 0, transition: { delay: 0.9, duration: 0.6, ease: "easeIn" } },
};

const hudLabelVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

const sitePayload: Record<Site, { wind_speed_kmh: number; wind_gust_kmh: number; visibility_km: number; cloud_ceiling_ft: number; temperature_c: number; precipitation_mm_h: number; lightning_distance_km: number; humidity_pct: number }> = {
  sdsc: {
    wind_speed_kmh: 12,
    wind_gust_kmh: 18,
    visibility_km: 22,
    cloud_ceiling_ft: 8000,
    temperature_c: 28,
    precipitation_mm_h: 0.1,
    lightning_distance_km: 99,
    humidity_pct: 70,
  },
  vssc: {
    wind_speed_kmh: 17,
    wind_gust_kmh: 26,
    visibility_km: 18,
    cloud_ceiling_ft: 6200,
    temperature_c: 31,
    precipitation_mm_h: 0.3,
    lightning_distance_km: 75,
    humidity_pct: 76,
  },
  aki: {
    wind_speed_kmh: 20,
    wind_gust_kmh: 30,
    visibility_km: 14,
    cloud_ceiling_ft: 5000,
    temperature_c: 30,
    precipitation_mm_h: 0.5,
    lightning_distance_km: 42,
    humidity_pct: 80,
  },
};

export default function RocketLaunchCard() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const launchTimerRef = useRef<number | null>(null);
  const smokeTimerRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<Phase>("assembling");
  const [site] = useState<Site>("sdsc");
  const [countdown, setCountdown] = useState(3);
  const [smokeLinger, setSmokeLinger] = useState(false);
  const [showHoldResult, setShowHoldResult] = useState(false);

  useEffect(() => {
    setPhase("assembling");
    setCountdown(3);
    setSmokeLinger(false);
    setShowHoldResult(false);

    const t = window.setTimeout(() => setPhase("scanning"), 2200);
    return () => window.clearTimeout(t);
  }, [site]);

  useEffect(() => {
    if (phase !== "scanning") return;

    const ac = new AbortController();
    const run = async () => {
      try {
        const scanDelay = new Promise((resolve) => window.setTimeout(resolve, 1500));
        const response = await fetch(`${apiBase}/api/v1/scrub/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...sitePayload[site], site_id: site }),
          signal: ac.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as PredictionResult;
        await scanDelay;
        if (ac.signal.aborted) return;

        const hasViolations = (payload.lwcc_violations ?? []).length > 0;
        const isGo = payload.scrub_probability < 50 && !hasViolations && payload.go_no_go.toUpperCase() === "GO";
        setPhase(isGo ? "countdown" : "hold");
      } catch {
        if (ac.signal.aborted) return;
        setPhase("error");
      }
    };

    void run();
    return () => ac.abort();
  }, [apiBase, phase, site]);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown === 0) {
      setPhase("launching");
      return;
    }
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [phase, countdown]);

  useEffect(() => {
    if (phase !== "launching") return;

    launchTimerRef.current = window.setTimeout(() => {
      setPhase("launched");
      setSmokeLinger(true);
    }, 1800);

    smokeTimerRef.current = window.setTimeout(() => {
      setSmokeLinger(false);
    }, 4800);

    return () => {
      if (launchTimerRef.current) window.clearTimeout(launchTimerRef.current);
      if (smokeTimerRef.current) window.clearTimeout(smokeTimerRef.current);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "hold") return;
    const t = window.setTimeout(() => setShowHoldResult(true), 900);
    return () => window.clearTimeout(t);
  }, [phase]);

  const showSmoke = phase === "launching" || smokeLinger;

  const rocketState = useMemo(() => {
    if (phase === "launching") return "launching";
    if (phase === "hold") return "shaking";
    if (phase === "assembling") return "assembled";
    return "hovering";
  }, [phase]);

  const wrapperShake =
    phase === "launching"
      ? { x: [0, -2, 2, -2, 0], transition: { repeat: Infinity, duration: 0.2 } }
      : phase === "hold"
        ? { x: [0, -3, 3, -3, 0], transition: { duration: 0.5 } }
        : { x: 0 };

  if (phase === "launched" || phase === "error" || (phase === "hold" && showHoldResult)) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative flex min-h-130 flex-col overflow-hidden px-5 py-6"
      />
    );
  }

  return (
    <motion.div
      animate={wrapperShake}
      className="relative min-h-130 overflow-hidden"
      style={{ willChange: "transform" }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_82%,rgba(79,142,247,0.18),transparent_46%)]" />

      <div className="relative mx-auto w-50 pt-8">
        <AnimatePresence>
          {phase === "countdown" && (
            <motion.div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
              <motion.span
                key={countdown}
                initial={{ scale: 1.6, opacity: 1 }}
                animate={{ scale: 1.0, opacity: 0.8 }}
                exit={{ scale: 0.6, opacity: 0 }}
                className="font-space text-8xl font-black text-white"
                style={{ textShadow: "0 0 40px #4f8ef7" }}
              >
                {countdown === 0 ? "LIFT OFF" : countdown}
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div variants={rocketVariants} initial="hidden" animate={rocketState} className="relative">
          <svg viewBox="0 0 200 500" className="mx-auto h-125 w-50 overflow-visible" aria-label="Chronos launch rocket">
            <defs>
              <linearGradient id="noseGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0d1f3c" />
                <stop offset="50%" stopColor="#1a3a6e" />
                <stop offset="100%" stopColor="#0d1f3c" />
              </linearGradient>
              <linearGradient id="bodyGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0a1628" />
                <stop offset="40%" stopColor="#1e3a5f" />
                <stop offset="100%" stopColor="#0a1628" />
              </linearGradient>
              <linearGradient id="engineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1a2744" />
                <stop offset="100%" stopColor="#7c3a00" />
              </linearGradient>
              <linearGradient id="boosterGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0a1628" />
                <stop offset="50%" stopColor="#162d50" />
                <stop offset="100%" stopColor="#0a1628" />
              </linearGradient>
              <filter id="engineGlow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="neonGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <motion.g initial="hidden" animate="assembled">
              <motion.rect
                x="85"
                y="360"
                width="30"
                height="80"
                fill="#1a2744"
                stroke="#2d3147"
                strokeWidth="1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 1.35, duration: 0.25 } }}
              />
              <motion.rect
                x="40"
                y="430"
                width="120"
                height="20"
                fill="#122038"
                stroke="#2d3147"
                strokeWidth="1"
                rx="2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 1.6, duration: 0.25 } }}
              />
              <motion.ellipse cx="100" cy="450" rx="50" ry="8" fill="#070b14" stroke="#2d3147" strokeWidth="1" />
              <motion.line x1="70" y1="370" x2="55" y2="430" stroke="#2d3147" strokeWidth="3" />
              <motion.line x1="130" y1="370" x2="145" y2="430" stroke="#2d3147" strokeWidth="3" />
            </motion.g>

            <motion.g
              variants={noseVariants}
              initial="hidden"
              animate={phase === "hold" ? { y: [0, -8, 0], opacity: [1, 0.85, 1] } : "assembled"}
            >
              <motion.path d="M100,20 L130,120 L70,120 Z" fill="url(#noseGradient)" stroke="#4f8ef7" strokeWidth="1.5" />
              <motion.text x="100" y="80" textAnchor="middle" fill="white" fontSize="10" className="font-space">
                CHRONOS-1
              </motion.text>
            </motion.g>

            <motion.g
              variants={bodyVariants}
              initial="hidden"
              animate={phase === "hold" ? { x: [0, -8, 0], opacity: 1 } : "assembled"}
            >
              <motion.rect x="70" y="120" width="60" height="180" fill="url(#bodyGradient)" stroke="#4f8ef7" strokeWidth="1.5" rx="4" />
              <motion.circle cx="100" cy="200" r="15" fill="#0d1526" stroke="#06b6d4" strokeWidth="2" />
              <motion.rect x="70" y="230" width="60" height="8" fill="#FF9933" />
              <motion.rect x="70" y="238" width="60" height="8" fill="white" />
              <motion.rect x="70" y="246" width="60" height="8" fill="#138808" />
            </motion.g>

            <motion.g
              variants={engineVariants}
              initial="hidden"
              animate={phase === "hold" ? { y: [0, 8, 0], opacity: 1 } : "assembled"}
              style={{ filter: phase === "launching" ? "url(#engineGlow)" : "none" }}
            >
              <motion.path
                d="M80,300 L75,360 L125,360 L120,300 Z"
                fill={phase === "launching" ? "#fff4d9" : "url(#engineGradient)"}
                stroke="#f59e0b"
                strokeWidth="1.5"
              />
              <motion.ellipse cx="100" cy="360" rx="25" ry="6" fill="#030408" stroke="#f59e0b" strokeWidth="1" />
            </motion.g>

            <motion.g
              variants={boosterLeftVariants}
              initial="hidden"
              animate={phase === "launching" ? "separating" : phase === "hold" ? "hidden" : "assembled"}
              style={{ originX: 0.5, originY: 0.5 }}
            >
              <motion.rect x="30" y="150" width="30" height="120" fill="url(#boosterGradient)" stroke="#4f8ef7" strokeWidth="1" rx="8" />
              <motion.ellipse cx="45" cy="270" rx="12" ry="4" fill="#030408" stroke="#f59e0b" strokeWidth="1" />
            </motion.g>

            <motion.g
              variants={boosterRightVariants}
              initial="hidden"
              animate={phase === "launching" ? "separating" : phase === "hold" ? "hidden" : "assembled"}
              style={{ originX: 0.5, originY: 0.5 }}
            >
              <motion.rect x="140" y="150" width="30" height="120" fill="url(#boosterGradient)" stroke="#4f8ef7" strokeWidth="1" rx="8" />
              <motion.ellipse cx="155" cy="270" rx="12" ry="4" fill="#030408" stroke="#f59e0b" strokeWidth="1" />
            </motion.g>

            {phase === "scanning" && (
              <motion.rect
                x="66"
                y="112"
                width="68"
                height="196"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1.5"
                strokeDasharray="8 6"
                filter="url(#neonGlow)"
                initial={{ strokeDashoffset: 0 }}
                animate={{ strokeDashoffset: -42 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            )}

            {phase === "launching" && (
              <motion.line
                x1="100"
                y1="360"
                x2="100"
                y2="498"
                stroke="url(#flameTrail)"
                strokeWidth="12"
                strokeLinecap="round"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.2, 0.8, 0.3] }}
                transition={{ repeat: Infinity, duration: 0.25 }}
              />
            )}

            <defs>
              <linearGradient id="flameTrail" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255, 216, 138, 0.95)" />
                <stop offset="60%" stopColor="rgba(255, 140, 0, 0.7)" />
                <stop offset="100%" stopColor="rgba(255, 69, 0, 0.05)" />
              </linearGradient>
            </defs>
          </svg>

          {phase === "scanning" && (
            <>
              <motion.div
                className="absolute"
                style={{ top: "8%", left: "65%" }}
                variants={hudLabelVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.2 }}
              >
                <span className="font-mono text-xs text-cyan-400">AERODYNAMICS ✓</span>
              </motion.div>
              <motion.div
                className="absolute"
                style={{ top: "38%", left: "65%" }}
                variants={hudLabelVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.6 }}
              >
                <span className="font-mono text-xs text-cyan-400">PAYLOAD ✓</span>
              </motion.div>
              <motion.div
                className="absolute"
                style={{ top: "62%", left: "65%" }}
                variants={hudLabelVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 1.0 }}
              >
                <span className="font-mono text-xs text-cyan-400">PROPULSION ✓</span>
              </motion.div>
              <motion.div
                className="absolute"
                style={{ top: "38%", right: "65%" }}
                variants={hudLabelVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 1.4 }}
              >
                <span className="font-mono text-xs text-cyan-400">SRBs ✓</span>
              </motion.div>
            </>
          )}

          <RocketParticles active={phase === "launching"} type="fire" />
          <RocketParticles active={showSmoke} type="smoke" />
          <RocketParticles active={phase === "hold"} type="warning" />
        </motion.div>
      </div>
    </motion.div>
  );
}
