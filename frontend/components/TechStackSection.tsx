"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

const techStack = [
  { icon: "🐍", name: "Python", category: "ML Core", color: "#4f8ef7", desc: "Core language" },
  { icon: "🌲", name: "scikit-learn", category: "ML Core", color: "#4f8ef7", desc: "Random Forest" },
  { icon: "🔢", name: "NumPy", category: "ML Core", color: "#4f8ef7", desc: "Numerical ops" },
  { icon: "🐼", name: "Pandas", category: "ML Core", color: "#4f8ef7", desc: "Data wrangling" },
  { icon: "▲", name: "Next.js", category: "Frontend", color: "#06b6d4", desc: "React framework" },
  { icon: "🎨", name: "Tailwind CSS", category: "Frontend", color: "#06b6d4", desc: "Styling" },
  { icon: "🎭", name: "Framer Motion", category: "Frontend", color: "#06b6d4", desc: "Animations" },
  { icon: "🌐", name: "Three.js", category: "Frontend", color: "#06b6d4", desc: "3D solar system" },
  { icon: "⚡", name: "FastAPI", category: "Backend", color: "#22c55e", desc: "REST API" },
  { icon: "🌤️", name: "Open-Meteo", category: "Data", color: "#f59e0b", desc: "Weather API" },
  { icon: "🌳", name: "Random Forest", category: "Algorithm", color: "#a855f7", desc: "250 trees" },
  { icon: "🛡️", name: "LWCC Criteria", category: "Rules", color: "#ef4444", desc: "ISRO standards" },
];

const categories = ["All", "ML Core", "Frontend", "Backend", "Data", "Algorithm", "Rules"] as const;

export default function TechStackSection() {
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]>("All");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const filtered = useMemo(
    () => techStack.filter((item) => activeCategory === "All" || item.category === activeCategory),
    [activeCategory]
  );

  return (
    <section id="built-with" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mb-8">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-left font-space text-4xl font-bold leading-[1.08] tracking-tight text-white md:text-5xl"
        >
          Built With
        </motion.h2>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((category) => {
          const isActive = category === activeCategory;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className="rounded-full border border-space-600 px-3 py-1.5 text-[11px] font-mono tracking-wide transition"
              style={{
                color: isActive ? "#06b6d4" : "#94a3b8",
                background: isActive ? "rgba(6,182,212,0.12)" : "rgba(13,21,38,0.45)",
                borderColor: isActive ? "rgba(6,182,212,0.35)" : undefined,
              }}
            >
              {category}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {filtered.map((tech, i) => (
          <motion.div
            key={tech.name}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.15 } }}
            className="group relative cursor-default overflow-hidden rounded-xl border border-space-600 bg-space-800/60 p-4 backdrop-blur-sm"
            style={{
              borderColor: hoveredIndex === i ? tech.color : undefined,
              boxShadow: hoveredIndex === i ? `0 0 20px ${tech.color}20` : "none",
              transition: "border-color 0.3s, box-shadow 0.3s",
            }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div
              className="absolute top-0 right-0 h-8 w-8 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: `radial-gradient(circle at top right, ${tech.color}30, transparent)` }}
            />

            <div className="mb-3 text-2xl transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6">
              {tech.icon}
            </div>

            <p className="mb-0.5 text-sm font-medium text-white">{tech.name}</p>
            <p className="text-xs text-slate-500">{tech.desc}</p>

            <div className="absolute right-3 bottom-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <span
                className="rounded px-1.5 py-0.5 text-[9px] font-mono"
                style={{ color: tech.color, background: `${tech.color}15`, border: `1px solid ${tech.color}30` }}
              >
                {tech.category}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.p
        className="mt-8 text-center text-xs font-mono text-slate-600"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        12 technologies · 4 categories · 1 mission
      </motion.p>
    </section>
  );
}
