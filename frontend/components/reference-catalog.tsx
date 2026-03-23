"use client";

import { motion } from "framer-motion";
import {
  Globe2,
  Rocket,
  MapPin,
  Clock,
  Zap,
  Layers,
  Compass,
  Ruler,
  Gauge,
  Package,
  Scale,
  Orbit,
  Building2,
  MoveVertical,
  CornerDownLeft,
  Hourglass,
  Satellite,
} from "lucide-react";
import { PremiumCard } from "@/components/ui/card-with-noise-pattern";

// ── Data ──────────────────────────────────────────────────────────────────────

const TARGET_BODIES = [
  {
    id: "moon",
    label: "Moon",
    accent: "#00E5FF",
    symbol: "☽",
    stats: [
      { icon: Ruler,        label: "Avg Distance",    value: "384,400 km" },
      { icon: Gauge,        label: "Surface Gravity", value: "1.62 m/s²"  },
      { icon: Clock,        label: "Orbital Period",  value: "27.3 days"  },
      { icon: Zap,          label: "ΔV from LEO",     value: "~3.9 km/s"  },
    ],
    description:
      "Earth's natural satellite and the only extraterrestrial body visited by humans. Tidal-lock means one hemisphere always faces Earth. Lunar missions leverage the Lagrange transfer corridor for fuel-efficient insertion.",
  },
  {
    id: "mars",
    label: "Mars",
    accent: "#FF3B5C",
    symbol: "♂",
    stats: [
      { icon: Ruler,        label: "Avg Distance",    value: "225M km"    },
      { icon: Gauge,        label: "Surface Gravity", value: "3.72 m/s²"  },
      { icon: Clock,        label: "Orbital Period",  value: "687 days"   },
      { icon: Zap,          label: "ΔV (Hohmann)",    value: "~5.7 km/s"  },
    ],
    description:
      "Fourth planet and primary target for deep-space exploration. Launch windows open every ~26 months at opposition. Thin CO₂ atmosphere (0.6% of Earth's) requires robust landing systems. Dust storms can persist for months.",
  },
  {
    id: "venus",
    label: "Venus",
    accent: "#F59E0B",
    symbol: "♀",
    stats: [
      { icon: Ruler,        label: "Avg Distance",    value: "170M km"    },
      { icon: Gauge,        label: "Surface Gravity", value: "8.87 m/s²"  },
      { icon: Clock,        label: "Orbital Period",  value: "225 days"   },
      { icon: Zap,          label: "ΔV (Hohmann)",    value: "~4.7 km/s"  },
    ],
    description:
      "Hottest planet at 465 °C mean surface temperature with crushing 92-bar SO₂ atmosphere. Retrograde rotation creates 243-day solar day. Gravity-assist flybys are frequently used for outer-planet trajectories.",
  },
];

const LAUNCH_PADS = [
  {
    id: "sdsc",
    label: "SDSC — Satish Dhawan Space Centre",
    location: "Sriharikota, Andhra Pradesh",
    coords: "13.7° N  80.2° E",
    accent: "#00C896",
    stats: [
      { icon: Compass,    label: "Azimuth Range",   value: "40° – 140°"        },
      { icon: Rocket,     label: "Capable Vehicles", value: "PSLV / GSLV / LVM3" },
      { icon: Building2,  label: "Active Pads",      value: "FLP + SLP"          },
      { icon: Orbit,      label: "Orbit Access",     value: "LEO · SSO · GTO"    },
    ],
    description:
      "India's primary orbital launch facility on Sriharikota Island. Two pads operate in parallel — First Launch Pad (FLP) serves PSLV, Second Launch Pad (SLP) handles GSLV and LVM3. Coastal location enables eastward and polar launches.",
  },
  {
    id: "vssc",
    label: "VSSC — Vikram Sarabhai Space Centre",
    location: "Thiruvananthapuram, Kerala",
    coords: "8.5° N  76.9° E",
    accent: "#8B5CF6",
    stats: [
      { icon: Compass,    label: "Azimuth Range",   value: "Sub-orbital"        },
      { icon: Rocket,     label: "Capable Vehicles", value: "Sounding Rockets"   },
      { icon: Building2,  label: "Primary Role",     value: "R&D / Testing"      },
      { icon: Orbit,      label: "Orbit Access",     value: "Sub-orbital only"   },
    ],
    description:
      "ISRO's main technical centre and sounding-rocket launch site. Conducts atmospheric research, new vehicle qualification testing, and sub-orbital payloads. Houses wind tunnels, structural test facilities, and propellant manufacturing.",
  },
  {
    id: "aki",
    label: "AKI — Abdul Kalam Island",
    location: "Bhadrak, Odisha",
    coords: "20.7° N  86.9° E",
    accent: "#0066FF",
    stats: [
      { icon: Compass,    label: "Azimuth Range",   value: "Sub-orbital"        },
      { icon: Rocket,     label: "Capable Vehicles", value: "Sounding / Ballistic" },
      { icon: Building2,  label: "Primary Role",     value: "Defence / Test"     },
      { icon: Orbit,      label: "Orbit Access",     value: "Sub-orbital only"   },
    ],
    description:
      "Formerly Wheeler Island, renamed in 2015. Serves as the principal test range for DRDO missile programmes and ISRO sub-orbital sounding rockets over the Bay of Bengal. Offshore location provides a safe downrange corridor.",
  },
];

const VEHICLES = [
  {
    id: "sounding",
    label: "Sounding Rocket",
    accent: "rgba(240,244,255,0.4)",
    safetyClass: "LIGHT",
    safetyAccent: "#00C896",
    stats: [
      { icon: MoveVertical, label: "Max Apogee",     value: "~500 km"   },
      { icon: Scale,        label: "Lift-off Mass",  value: "0.5–2 t"   },
      { icon: Package,      label: "Payload",        value: "50–200 kg" },
      { icon: Layers,       label: "Stages",         value: "1–2"       },
    ],
    description:
      "Single or two-stage vehicles for atmospheric and microgravity research. Flight durations of 5–15 min above the Kármán line. No orbital capability; payloads are typically recovered by parachute.",
  },
  {
    id: "sslv",
    label: "SSLV — Small Satellite Launch Vehicle",
    accent: "#00E5FF",
    safetyClass: "LIGHT",
    safetyAccent: "#00C896",
    stats: [
      { icon: Ruler,        label: "Height",         value: "34 m"       },
      { icon: Scale,        label: "Lift-off Mass",  value: "120 t"      },
      { icon: Package,      label: "Payload (LEO)",  value: "500 kg"     },
      { icon: Layers,       label: "Stages",         value: "3 + VTM"    },
    ],
    description:
      "Rapid-turnaround small-lift vehicle with on-demand launch philosophy. Three solid stages plus a velocity-trimming module. Suitable for microsatellite constellations, student payloads, and commercial small-sats to LEO/SSO.",
  },
  {
    id: "pslv",
    label: "PSLV — Polar Satellite Launch Vehicle",
    accent: "#0066FF",
    safetyClass: "MEDIUM",
    safetyAccent: "#F59E0B",
    stats: [
      { icon: Ruler,        label: "Height",          value: "44 m"         },
      { icon: Scale,        label: "Lift-off Mass",   value: "320 t"        },
      { icon: Package,      label: "Payload",         value: "3,800 kg LEO / 1,750 kg GTO" },
      { icon: Layers,       label: "Stages",          value: "4 (alt. solid/liquid)" },
    ],
    description:
      "India's workhorse launcher with 60+ successful flights. Alternating solid and liquid stages (PSLV-XL adds six strap-on boosters). Flew Chandrayaan-1, Mangalyaan, and over 350 foreign satellites. Highly reliable mid-lift vehicle.",
  },
  {
    id: "gslv2",
    label: "GSLV Mk II — Geosynchronous Satellite Launch Vehicle",
    accent: "#F59E0B",
    safetyClass: "HEAVY",
    safetyAccent: "#FF3B5C",
    stats: [
      { icon: Ruler,        label: "Height",          value: "49 m"        },
      { icon: Scale,        label: "Lift-off Mass",   value: "415 t"       },
      { icon: Package,      label: "Payload (GTO)",   value: "2,500 kg"    },
      { icon: Layers,       label: "Stages",          value: "3 + 4 boosters" },
    ],
    description:
      "Domestic cryogenic upper stage (CE-7.5) introduced after CUS mastery in 2014. Primary mission is INSAT/GSAT series to GTO. Four liquid strap-on boosters and a cryogenic third stage enable high-energy transfer orbits.",
  },
  {
    id: "lvm3",
    label: "LVM3 — Launch Vehicle Mark 3",
    accent: "#FF3B5C",
    safetyClass: "SUPERHEAVY",
    safetyAccent: "#FF3B5C",
    stats: [
      { icon: Ruler,        label: "Height",          value: "43.5 m"      },
      { icon: Scale,        label: "Lift-off Mass",   value: "640 t"       },
      { icon: Package,      label: "Payload",         value: "8,000 kg LEO / 4,000 kg GTO" },
      { icon: Layers,       label: "Stages",          value: "2 + cryogenic + 2 S200 boosters" },
    ],
    description:
      "India's heaviest operational launcher (formerly GSLV Mk III). Two S200 solid strap-ons, L110 liquid core, and C25 cryogenic upper stage. Launched Chandrayaan-3 and OneWeb satellites. Human-rated variant (Gaganyaan) in development.",
  },
];

const ORBITS = [
  {
    id: "leo",
    label: "LEO — Low Earth Orbit",
    accent: "#00E5FF",
    stats: [
      { icon: MoveVertical, label: "Altitude",        value: "200–2,000 km" },
      { icon: Clock,        label: "Orbital Period",  value: "90–120 min"   },
      { icon: Compass,      label: "Inclination",     value: "Any (0°–90°)" },
      { icon: Zap,          label: "ΔV to orbit",     value: "~7.8 km/s"    },
    ],
    description:
      "Most common orbit for Earth observation, ISS resupply, and constellation satellites. Short communication line-of-sight windows (8–15 min per pass) require large ground-station networks or inter-satellite links. Drag causes rapid orbital decay below 400 km.",
  },
  {
    id: "sso",
    label: "SSO — Sun-Synchronous Orbit",
    accent: "#8B5CF6",
    stats: [
      { icon: MoveVertical, label: "Altitude",        value: "~500–900 km"  },
      { icon: Clock,        label: "Orbital Period",  value: "~97 min"      },
      { icon: Compass,      label: "Inclination",     value: "~97°–98°"     },
      { icon: Zap,          label: "ΔV Extra vs LEO", value: "+0.3–0.5 km/s" },
    ],
    description:
      "Retrograde near-polar orbit with nodal precession rate matching Earth's annual revolution (~0.9856°/day). Guarantees constant local solar time on every equatorial pass — essential for consistent lighting in Earth-imaging and weather missions.",
  },
  {
    id: "geo",
    label: "GEO — Geostationary Orbit",
    accent: "#F59E0B",
    stats: [
      { icon: MoveVertical, label: "Altitude",        value: "35,786 km"    },
      { icon: Clock,        label: "Orbital Period",  value: "24 hours"     },
      { icon: Compass,      label: "Inclination",     value: "0° (equatorial)" },
      { icon: Zap,          label: "ΔV (GTO→GEO)",   value: "~1.8 km/s"    },
    ],
    description:
      "Appears stationary over a fixed equatorial point. Three GEO satellites cover most of Earth for continuous communications, TV broadcast, and meteorology. High altitude gives ~1/4-second round-trip latency. Graveyard disposal orbit at +300 km.",
  },
  {
    id: "sub",
    label: "Sub-orbital",
    accent: "#00C896",
    stats: [
      { icon: MoveVertical,    label: "Peak Altitude",   value: "100–500 km"   },
      { icon: Hourglass,       label: "Flight Duration", value: "5–15 min"     },
      { icon: CornerDownLeft,  label: "Re-entry",        value: "Same hemisphere" },
      { icon: Zap,             label: "ΔV Required",     value: "<7.8 km/s"    },
    ],
    description:
      "Trajectory that crosses the Kármán line (100 km) but lacks sufficient horizontal velocity to achieve orbit. Used for atmospheric sounding, microgravity experiments, hypersonic vehicle testing, and space tourism. Payload recovered downrange.",
  },
];

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  accent,
  children,
  delay = 0,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accent: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${accent}18`, color: accent }}
        >
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="text-[16px] font-semibold" style={{ color: "#F0F4FF" }}>{title}</h2>
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>
      {children}
    </motion.section>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────

function StatPill({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: accent }} />
      <div>
        <p className="text-[10px] uppercase tracking-[0.08em] font-semibold mb-0.5"
          style={{ color: "rgba(240,244,255,0.35)" }}>{label}</p>
        <p className="text-[13px] font-medium font-['JetBrains_Mono',monospace]"
          style={{ color: "#F0F4FF" }}>{value}</p>
      </div>
    </div>
  );
}

// ── ReferenceCatalog ──────────────────────────────────────────────────────────

export function ReferenceCatalog() {
  return (
    <div className="space-y-12">

      {/* Target Bodies */}
      <Section title="Target Bodies" icon={Globe2} accent="#00E5FF" delay={0.05}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TARGET_BODIES.map((body) => (
            <PremiumCard key={body.id}>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold leading-none shrink-0"
                    style={{ background: `${body.accent}18`, color: body.accent }}
                  >
                    {body.symbol}
                  </div>
                  <h3 className="text-[15px] font-semibold" style={{ color: "#F0F4FF" }}>
                    {body.label}
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {body.stats.map((s) => (
                    <StatPill key={s.label} icon={s.icon} label={s.label} value={s.value} accent={body.accent} />
                  ))}
                </div>
                <p className="text-[12px] leading-relaxed"
                  style={{ color: "rgba(240,244,255,0.45)" }}>
                  {body.description}
                </p>
              </div>
            </PremiumCard>
          ))}
        </div>
      </Section>

      {/* Launch Pads */}
      <Section title="Launch Pads" icon={MapPin} accent="#00C896" delay={0.1}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {LAUNCH_PADS.map((pad) => (
            <PremiumCard key={pad.id}>
              <div className="p-5 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: pad.accent }} />
                    <h3 className="text-[14px] font-semibold leading-tight" style={{ color: "#F0F4FF" }}>
                      {pad.label}
                    </h3>
                  </div>
                  <p className="text-[11px] pl-4" style={{ color: "rgba(240,244,255,0.4)" }}>
                    {pad.location} &middot; {pad.coords}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {pad.stats.map((s) => (
                    <StatPill key={s.label} icon={s.icon} label={s.label} value={s.value} accent={pad.accent} />
                  ))}
                </div>
                <p className="text-[12px] leading-relaxed"
                  style={{ color: "rgba(240,244,255,0.45)" }}>
                  {pad.description}
                </p>
              </div>
            </PremiumCard>
          ))}
        </div>
      </Section>

      {/* Vehicle Classes */}
      <Section title="Vehicle Classes" icon={Rocket} accent="#0066FF" delay={0.15}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {VEHICLES.map((v) => (
            <PremiumCard key={v.id}>
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[14px] font-semibold leading-snug" style={{ color: "#F0F4FF" }}>
                    {v.label}
                  </h3>
                  <span
                    className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
                    style={{ background: `${v.safetyAccent}18`, color: v.safetyAccent }}
                  >
                    {v.safetyClass}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {v.stats.map((s) => (
                    <StatPill key={s.label} icon={s.icon} label={s.label} value={s.value} accent={v.accent} />
                  ))}
                </div>
                <p className="text-[12px] leading-relaxed"
                  style={{ color: "rgba(240,244,255,0.45)" }}>
                  {v.description}
                </p>
              </div>
            </PremiumCard>
          ))}
        </div>
      </Section>

      {/* Orbit Types */}
      <Section title="Orbit Types" icon={Orbit} accent="#8B5CF6" delay={0.2}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ORBITS.map((o) => (
            <PremiumCard key={o.id}>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${o.accent}18`, color: o.accent }}
                  >
                    <Satellite className="w-4 h-4" />
                  </div>
                  <h3 className="text-[15px] font-semibold" style={{ color: "#F0F4FF" }}>
                    {o.label}
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {o.stats.map((s) => (
                    <StatPill key={s.label} icon={s.icon} label={s.label} value={s.value} accent={o.accent} />
                  ))}
                </div>
                <p className="text-[12px] leading-relaxed"
                  style={{ color: "rgba(240,244,255,0.45)" }}>
                  {o.description}
                </p>
              </div>
            </PremiumCard>
          ))}
        </div>
      </Section>

    </div>
  );
}
