"use client";

import { useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface FlickeringGridProps {
  color?: string;
  maxOpacity?: number;
  flickerChance?: number;
  squareSize?: number;
  gridGap?: number;
  className?: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
}

export function FlickeringGrid({
  color = "#06b6d4",
  maxOpacity = 0.08,
  flickerChance = 0.08,
  squareSize = 4,
  gridGap = 6,
  className,
}: FlickeringGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const cols      = useRef(0);
  const rows      = useRef(0);
  const squares   = useRef<Float32Array>(new Float32Array(0));

  const rgb = hexToRgb(color) ?? { r: 6, g: 182, b: 212 };
  const rgbStr = `${rgb.r}, ${rgb.g}, ${rgb.b}`;

  const cell = squareSize + gridGap;

  const init = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = canvas.offsetWidth  * dpr;
    canvas.height = canvas.offsetHeight * dpr;

    cols.current = Math.floor(canvas.width  / cell) + 1;
    rows.current = Math.floor(canvas.height / cell) + 1;
    squares.current = new Float32Array(cols.current * rows.current);
  }, [cell]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    init();

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const observer = new ResizeObserver(init);
    observer.observe(canvas);

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < squares.current.length; i++) {
        // Random flicker
        if (Math.random() < flickerChance) {
          squares.current[i] = Math.random() * maxOpacity;
        }

        const opacity = squares.current[i];
        if (opacity <= 0.001) continue;

        const col = i % cols.current;
        const row = Math.floor(i / cols.current);
        const x = col * cell * dpr;
        const y = row * cell * dpr;

        ctx.fillStyle = `rgba(${rgbStr}, ${opacity})`;
        ctx.fillRect(x, y, squareSize * dpr, squareSize * dpr);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
    };
  }, [init, cell, flickerChance, maxOpacity, rgbStr, squareSize]);

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        "pointer-events-none fixed inset-0 w-full h-full",
        className,
      )}
      style={{ zIndex: 0 }}
    />
  );
}
