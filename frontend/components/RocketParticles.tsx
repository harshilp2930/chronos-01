"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: string;
  size: number;
  duration: number;
}

type ParticleType = "fire" | "smoke" | "warning";

const palettes: Record<ParticleType, string[]> = {
  fire: ["#ff4500", "#ff8c00", "#ffd700", "#ff6b35"],
  smoke: ["rgba(255,255,255,0.45)", "rgba(203,213,225,0.4)", "rgba(148,163,184,0.35)"],
  warning: ["#ef4444", "#dc2626", "#b91c1c", "#f87171"],
};

function random(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function makeParticle(id: number, type: ParticleType): Particle {
  if (type === "smoke") {
    return {
      id,
      x: random(92, 108),
      y: random(356, 368),
      dx: random(-45, 45),
      dy: random(-50, 35),
      color: palettes.smoke[Math.floor(Math.random() * palettes.smoke.length)],
      size: random(20, 40),
      duration: random(0.8, 1.2),
    };
  }

  if (type === "warning") {
    return {
      id,
      x: random(80, 120),
      y: random(330, 370),
      dx: random(-35, 35),
      dy: random(-35, 50),
      color: palettes.warning[Math.floor(Math.random() * palettes.warning.length)],
      size: random(5, 12),
      duration: random(0.25, 0.55),
    };
  }

  return {
    id,
    x: random(94, 106),
    y: random(356, 366),
    dx: random(-30, 30),
    dy: random(80, 130),
    color: palettes.fire[Math.floor(Math.random() * palettes.fire.length)],
    size: random(4, 12),
    duration: random(0.2, 0.5),
  };
}

export default function RocketParticles({
  active,
  type,
}: {
  active: boolean;
  type: ParticleType;
}) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextIdRef = useRef(0);

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      const batch = Array.from({ length: 25 }, () => {
        nextIdRef.current += 1;
        return makeParticle(nextIdRef.current, type);
      });

      setParticles((prev) => [...prev, ...batch]);

      batch.forEach((particle) => {
        window.setTimeout(() => {
          setParticles((prev) => prev.filter((p) => p.id !== particle.id));
        }, Math.ceil(particle.duration * 1000) + 100);
      });
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [active, type]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => {
          const targetY = type === "fire" ? p.y + p.dy : p.y + p.dy;
          const blur = type === "smoke" ? "blur(8px)" : "blur(0px)";
          return (
            <motion.div
              key={p.id}
              initial={{ x: p.x, y: p.y, opacity: 1, scale: 1 }}
              animate={{
                x: p.x + p.dx,
                y: targetY,
                opacity: 0,
                scale: type === "smoke" ? 1.35 : 0.2,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: p.duration, ease: "easeOut" }}
              className="absolute rounded-full"
              style={{
                width: p.size,
                height: p.size,
                background: p.color,
                filter: blur,
                boxShadow:
                  type === "fire" || type === "warning"
                    ? `0 0 10px ${p.color}`
                    : `0 0 18px ${p.color}`,
              }}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
