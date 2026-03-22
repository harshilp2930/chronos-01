"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useInView } from "framer-motion";

interface Props {
  target: number;
  decimals?: number;
  duration?: number;
  className?: string;
  style?: CSSProperties;
}

export function CountUpNumber({
  target,
  decimals = 0,
  duration = 1800,
  className,
  style,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!isInView) {
      return;
    }

    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) ** 3;

      setValue(eased * target);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setValue(target);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, target, duration]);

  return (
    <span ref={ref} className={className} style={style}>
      {value.toFixed(decimals)}
    </span>
  );
}
