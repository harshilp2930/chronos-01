"use client";

interface Props {
  probability: number;   // 0 – 1
  riskLevel: string;     // "low" | "moderate" | "high" | "critical"
  goNoGo: string;        // "GO" | "NO-GO"
  factors?: Record<string, number>;
}

const toRad = (d: number) => (d * Math.PI) / 180;

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const sx = cx + r * Math.cos(toRad(startDeg));
  const sy = cy + r * Math.sin(toRad(startDeg));
  const ex = cx + r * Math.cos(toRad(endDeg));
  const ey = cy + r * Math.sin(toRad(endDeg));
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
}

export function WeatherGauge({ probability, riskLevel, goNoGo, factors }: Props) {
  const pct   = Math.min(Math.max(probability, 0), 1);
  const cx    = 120;
  const cy    = 105;
  const r     = 80;
  const sw    = 14;   // stroke width
  const TSTART = -180;

  // Zone colors
  const zones = [
    { from: 0,    to: 0.30, color: "#16a34a" },   // green
    { from: 0.30, to: 0.60, color: "#d97706" },   // amber
    { from: 0.60, to: 1.00, color: "#dc2626" },   // red
  ];

  // Needle
  const needleAngle = TSTART + pct * 180;
  const nLen = r - 14;
  const nx   = cx + nLen * Math.cos(toRad(needleAngle));
  const ny   = cy + nLen * Math.sin(toRad(needleAngle));

  // Tick marks at zone boundaries
  const ticks = [0, 0.30, 0.60, 1.0];

  // Status colour
  const isGo     = goNoGo === "GO";
  const statusBg = isGo ? "#052e16" : "#450a0a";
  const statusBorder = isGo ? "#16a34a" : "#dc2626";
  const statusText   = isGo ? "#4ade80" : "#f87171";

  const riskColor =
    riskLevel === "low"      ? { text: "#4ade80", bg: "#052e16", border: "#16a34a55" }
    : riskLevel === "moderate" ? { text: "#fbbf24", bg: "#1c1400", border: "#d9770655" }
    :                            { text: "#f87171", bg: "#450a0a", border: "#dc262655" };

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 240 145" className="w-full max-w-75">
        {/* ── Track background ── */}
        <path
          d={arcPath(cx, cy, r, TSTART, 0)}
          fill="none"
          stroke="#1e293b"
          strokeWidth={sw + 4}
          strokeLinecap="butt"
        />

        {/* ── Coloured zone arcs ── */}
        {zones.map(({ from, to, color }) => {
          const start = TSTART + from * 180;
          const end   = TSTART + to   * 180;
          return (
            <path
              key={color}
              d={arcPath(cx, cy, r, start, end)}
              fill="none"
              stroke={color}
              strokeWidth={sw}
              strokeLinecap="butt"
              opacity={0.22}
            />
          );
        })}

        {/* ── Active fill (up to current value) ── */}
        {pct > 0.005 && (() => {
          const activeZones = zones
            .filter(z => z.from < pct)
            .map(z => ({ ...z, to: Math.min(z.to, pct) }));
          return activeZones.map(({ from, to, color }) => (
            <path
              key={`fill-${color}`}
              d={arcPath(cx, cy, r, TSTART + from * 180, TSTART + to * 180)}
              fill="none"
              stroke={color}
              strokeWidth={sw}
              strokeLinecap="butt"
            />
          ));
        })()}

        {/* ── Tick marks ── */}
        {ticks.map((t) => {
          const a  = TSTART + t * 180;
          const ir = r - sw / 2 - 1;
          const or = r + sw / 2 + 5;
          return (
            <line
              key={t}
              x1={cx + ir * Math.cos(toRad(a))} y1={cy + ir * Math.sin(toRad(a))}
              x2={cx + or * Math.cos(toRad(a))} y2={cy + or * Math.sin(toRad(a))}
              stroke="#475569"
              strokeWidth={1.5}
            />
          );
        })}

        {/* Zone boundary labels */}
        {[{ t: 0, label: "0", anchor: "end" as const, dx: -6 },
          { t: 0.30, label: "30", anchor: "middle" as const, dx: 0 },
          { t: 0.60, label: "60", anchor: "middle" as const, dx: 0 },
          { t: 1.0,  label: "100", anchor: "start" as const, dx: 6 },
        ].map(({ t, label, anchor, dx }) => {
          const a  = TSTART + t * 180;
          const lr = r + sw / 2 + 14;
          return (
            <text
              key={label}
              x={cx + lr * Math.cos(toRad(a)) + dx}
              y={cy + lr * Math.sin(toRad(a)) + 1}
              textAnchor={anchor}
              fill="#64748b"
              fontSize={7.5}
              fontFamily="monospace"
            >
              {label}
            </text>
          );
        })}

        {/* ── Needle ── */}
        <line
          x1={cx} y1={cy}
          x2={nx} y2={ny}
          stroke="white"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={5} fill="#0f172a" stroke="white" strokeWidth={2} />

        {/* ── Value label below pivot ── */}
        <text
          x={cx} y={cy + 18}
          textAnchor="middle"
          fill="white"
          fontSize={20}
          fontWeight="bold"
          fontFamily="monospace"
        >
          {Math.round(pct * 100)}%
        </text>
        <text
          x={cx} y={cy + 29}
          textAnchor="middle"
          fill="#475569"
          fontSize={7}
          fontFamily="monospace"
          letterSpacing={1.5}
        >
          SCRUB RISK
        </text>
      </svg>

      {/* ── GO / NO-GO status pill ── */}
      <div
        className="flex items-center gap-2 px-5 py-2 rounded-full border text-sm font-bold font-mono tracking-widest uppercase"
        style={{ backgroundColor: statusBg, borderColor: statusBorder, color: statusText, boxShadow: `0 0 16px ${statusBorder}55` }}
      >
        <span
          className="w-2.5 h-2.5 rounded-full animate-pulse"
          style={{ backgroundColor: statusText }}
        />
        {goNoGo}
      </div>

      {/* ── Risk level badge ── */}
      <span
        className="text-xs font-mono uppercase px-3 py-1 rounded-md border"
        style={{ color: riskColor.text, backgroundColor: riskColor.bg, borderColor: riskColor.border }}
      >
        {riskLevel} risk
      </span>

      {/* ── Top weather factors ── */}
      {factors && Object.keys(factors).length > 0 && (
        <div className="w-full mt-1 space-y-1.5">
          {Object.entries(factors)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([key, val]) => {
              const barColor = val > 0.6 ? "#dc2626" : val > 0.3 ? "#d97706" : "#16a34a";
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 w-32 truncate capitalize font-mono">
                    {key.replace(/_/g, " ")}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.round(val * 100)}%`, backgroundColor: barColor }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono w-8 text-right">
                    {Math.round(val * 100)}%
                  </span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
