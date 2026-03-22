"use client";

import { useEffect, useRef } from "react";

interface GlowingStarsProps {
  /** Number of stars to render (default 160) */
  count?: number;
  /** Overall brightness multiplier 0-1 (default 0.7) */
  brightness?: number;
}

/**
 * Fixed-position canvas layer that renders small, softly glowing stars that
 * gently pulse in opacity — Apple-style ambient background depth.
 */
export function GlowingStars({ count = 160, brightness = 0.7 }: GlowingStarsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;

    // Seed a stable set of stars once
    interface StarDot {
      x: number; // 0-1 normalised
      y: number; // 0-1 normalised
      r: number; // base radius px
      baseAlpha: number;
      phase: number; // animation phase offset (radians)
      speed: number; // twinkle speed
      warm: boolean; // warm or cool tint
    }

    const stars: StarDot[] = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.1 + 0.35,       // 0.35 – 1.45 px
      baseAlpha: Math.random() * 0.55 + 0.25, // 0.25 – 0.80
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.006 + 0.003, // very slow
      warm: Math.random() > 0.65,
    }));

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 1;

      const W = canvas.width;
      const H = canvas.height;

      for (const s of stars) {
        const px = s.x * W;
        const py = s.y * H;

        // Gently oscillate alpha
        const alpha = s.baseAlpha * brightness * (0.6 + 0.4 * Math.sin(t * s.speed + s.phase));

        // Colour: cool blue-white or faint warm violet
        const color = s.warm ? `rgba(200,180,255,${alpha})` : `rgba(200,225,255,${alpha})`;

        // Glow halo
        const grad = ctx.createRadialGradient(px, py, 0, px, py, s.r * 5);
        grad.addColorStop(0, color);
        grad.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(px, py, s.r * 5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Bright centre dot
        ctx.beginPath();
        ctx.arc(px, py, s.r * 0.9, 0, Math.PI * 2);
        ctx.fillStyle = s.warm
          ? `rgba(230,210,255,${Math.min(1, alpha * 1.6)})`
          : `rgba(230,245,255,${Math.min(1, alpha * 1.6)})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [count, brightness]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 w-full h-full"
    />
  );
}
