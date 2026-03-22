"use client";

import { useState, useEffect } from "react";
import { Github, Twitter, Rocket, Satellite, Globe } from "lucide-react";

export default function Footer() {
  const [stars, setStars] = useState<{ size: number; top: number; left: number; opacity: number }[]>([]);

  useEffect(() => {
    setStars(
      Array.from({ length: 60 }, () => ({
        size: Math.random() * 1.5 + 0.5,
        top: Math.random() * 100,
        left: Math.random() * 100,
        opacity: Math.random() * 0.4 + 0.1,
      }))
    );
  }, []);

  return (
    <footer className="relative overflow-hidden border-t border-space-600">
      <div className="pointer-events-none absolute inset-0">
        {stars.map((star, i) => (
          <div
            key={`star-${i}`}
            className="absolute rounded-full bg-white"
            style={{
              width: `${star.size}px`,
              height: `${star.size}px`,
              top: `${star.top}%`,
              left: `${star.left}%`,
              opacity: star.opacity,
            }}
          />
        ))}
        <div className="absolute bottom-0 left-1/4 h-48 w-96 rounded-full bg-neon-blue/5 blur-[80px]" />
        <div className="absolute bottom-0 right-1/4 h-48 w-96 rounded-full bg-neon-purple/5 blur-[80px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 pt-16 pb-8">
        <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-3">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-lg">🚀</span>
              <span className="font-space font-bold text-white">
                CHRONOS<span className="text-neon-blue">-1</span>
              </span>
            </div>
            <p className="mb-4 text-sm leading-relaxed text-slate-400">
              Launch Intelligence for the Final Frontier. AI-powered weather scrub risk prediction for ISRO
              missions.
            </p>

            <div className="flex items-center gap-3">
              {[
                { icon: Github, href: "https://github.com", label: "GitHub" },
                { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
                { icon: Globe, href: "#", label: "Website" },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-space-600 bg-space-800 text-slate-400 transition-all duration-200 hover:border-neon-blue/50 hover:bg-neon-blue/10 hover:text-white"
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-4 text-sm font-medium text-white">Navigation</p>
            <div className="flex flex-col gap-2">
              {[
                { label: "Home", href: "#" },
                { label: "How It Works", href: "#how-it-works" },
                { label: "Model Stats", href: "#model" },
                { label: "Mission Control", href: "#mission" },
                { label: "Contact", href: "#contact" },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  className="group flex items-center gap-2 text-sm text-slate-400 transition-colors duration-200 hover:text-neon-cyan"
                >
                  <span className="h-px w-0 bg-neon-cyan transition-all duration-200 group-hover:w-3" />
                  {label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-4 text-sm font-medium text-white">Launch Sites</p>
            <div className="flex flex-col gap-3">
              {[
                { code: "SDSC", name: "Sriharikota", lat: "13.7°N", status: "active" },
                { code: "VSSC", name: "Trivandrum", lat: "8.5°N", status: "active" },
                { code: "AKI", name: "Abdul Kalam Island", lat: "15.1°N", status: "active" },
              ].map((site) => (
                <div key={site.code} className="flex items-center justify-between rounded-lg border border-space-600 bg-space-800 px-3 py-2">
                  <div>
                    <span className="text-xs font-bold font-mono text-white">{site.code}</span>
                    <span className="ml-2 text-xs text-slate-500">{site.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon-green" />
                    <span className="text-[10px] font-mono text-neon-green uppercase">
                      {site.status === "active" ? "NOMINAL" : site.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-600">
              Powered by <span className="text-slate-500">Open-Meteo API</span> ·{" "}
              <span className="text-slate-500">ISRO LWCC</span> · <span className="text-slate-500">scikit-learn</span>
            </p>
          </div>
        </div>

        <div className="mb-6 h-px bg-linear-to-r from-transparent via-space-600 to-transparent" />

        <div className="flex flex-col items-center justify-between gap-3 text-xs font-mono text-slate-600 md:flex-row">
          <span>© 2026 Chronos-1 · Built for real ISRO launch prediction</span>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon-green" />
            <span className="text-neon-green">All systems nominal</span>
          </div>
          <span className="flex items-center gap-1.5">
            <Rocket size={12} className="text-slate-500" />
            <Satellite size={12} className="text-slate-500" />
            <span>Serving SDSC · VSSC · AKI</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
