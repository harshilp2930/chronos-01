"use client";

import { useCallback, useEffect, useRef } from "react";

interface DotGridBackgroundProps {
  spacing?: number;
  baseOpacity?: number;
  glowOpacity?: number;
  glowRadius?: number;
  glowColor?: string;
  dotColor?: string;
  dotRadius?: number;
}

export default function DotGridBackground({
  spacing = 14,
  baseOpacity = 0.13,
  glowOpacity = 0.75,
  glowRadius = 120,
  glowColor = "79,142,247",
  dotColor = "255,255,255",
  dotRadius = 1.3,
}: DotGridBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const rafRef = useRef<number | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;

    ctx.clearRect(0, 0, w, h);

    const offsetX = (w % spacing) / 2;
    const offsetY = (h % spacing) / 2;
    const cols = Math.ceil(w / spacing) + 1;
    const rows = Math.ceil(h / spacing) + 1;

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const x = offsetX + c * spacing;
        const y = offsetY + r * spacing;
        const dx = x - mx;
        const dy = y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let alpha: number;
        let rgb: string;

        if (dist < glowRadius) {
          const t = 1 - dist / glowRadius;
          const ease = t * t * (3 - 2 * t);
          alpha = baseOpacity + ease * (glowOpacity - baseOpacity);
          rgb = glowColor;
        } else {
          alpha = baseOpacity;
          rgb = dotColor;
        }

        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${alpha})`;
        ctx.fill();
      }
    }

  }, [spacing, baseOpacity, glowOpacity, glowRadius, glowColor, dotColor, dotRadius]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasEl = canvas;

    function resize() {
      canvasEl.width = window.innerWidth;
      canvasEl.height = window.innerHeight;
    }

    function onMouseMove(e: MouseEvent) {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    }

    function onMouseLeave() {
      mouseRef.current = { x: -9999, y: -9999 };
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseleave", onMouseLeave);

    function loop() {
      draw();
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
