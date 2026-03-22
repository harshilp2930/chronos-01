"use client"

import React from "react"
import { cn } from "@/lib/utils"

// ── Plus corner icons ─────────────────────────────────────────────────────────

const PlusIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    width={20}
    height={20}
    strokeWidth="1"
    stroke="currentColor"
    className={cn("text-cyan-500/70 size-5", className)}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
  </svg>
)

const CornerPlusIcons = () => (
  <>
    <PlusIcon className="absolute -top-2.5 -left-2.5" />
    <PlusIcon className="absolute -top-2.5 -right-2.5" />
    <PlusIcon className="absolute -bottom-2.5 -left-2.5" />
    <PlusIcon className="absolute -bottom-2.5 -right-2.5" />
  </>
)

// ── PlusCard ──────────────────────────────────────────────────────────────────

export const PlusCard: React.FC<{
  className?: string
  title: string
  description: string
}> = ({ className = "", title, description }) => {
  return (
    <div
      className={cn(
        "relative border border-dashed border-zinc-700 rounded-xl p-6 bg-white/[0.02] min-h-[200px]",
        "flex flex-col justify-between",
        className
      )}
    >
      <CornerPlusIcons />
      <div className="relative z-10 space-y-2">
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <p className="text-slate-400">{description}</p>
      </div>
    </div>
  )
}

// ── Bento grid demo ───────────────────────────────────────────────────────────

const cardContents = [
  {
    title: "Intelligent Mission Planning",
    description:
      "CHRONOS-1 provides AI-powered trajectory optimisation using genetic algorithms to find the most efficient launch windows.",
  },
  {
    title: "Safety Zone Analysis",
    description:
      "Automated safety exclusion zone calculation with real-time visualisation for every launch scenario.",
  },
  {
    title: "Multi-Role Workflow",
    description:
      "A dedicated review pipeline separates Mission Planners from Safety Officers — missions flow through draft, submission, approval, and rejection stages with full audit trails. Each role sees only the data and actions relevant to them, ensuring clean separation of concerns and accountability at every step.",
  },
  {
    title: "Weather Risk Modelling",
    description:
      "Integrated scrub-risk scoring based on live atmospheric conditions at each launch pad.",
  },
  {
    title: "Real-Time Analytics",
    description:
      "Comprehensive dashboards surface mission statistics, approval rates, and delta-V trends at a glance.",
  },
]

export default function RuixenBentoCards() {
  return (
    <section className="bg-[#02040e] border border-zinc-800">
      <div className="mx-auto container border border-zinc-800 py-12 border-t-0 px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 auto-rows-auto gap-6">
          <PlusCard {...cardContents[0]} className="lg:col-span-3 lg:row-span-2" />
          <PlusCard {...cardContents[1]} className="lg:col-span-2 lg:row-span-2" />
          <PlusCard {...cardContents[2]} className="lg:col-span-4 lg:row-span-1" />
          <PlusCard {...cardContents[3]} className="lg:col-span-2 lg:row-span-1" />
          <PlusCard {...cardContents[4]} className="lg:col-span-2 lg:row-span-1" />
        </div>
        <div className="max-w-2xl ml-auto text-right px-4 mt-6 lg:-mt-20">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Built for mission-critical operations.
          </h2>
          <p className="text-slate-400 text-lg">
            CHRONOS-1 gives your team the tools to plan, review, and approve space missions with speed and precision.
          </p>
        </div>
      </div>
    </section>
  )
}
