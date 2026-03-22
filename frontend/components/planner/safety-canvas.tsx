"use client";

import { useRef, useEffect } from "react";

interface ZonePoint {
  lat: number;
  lon: number;
}

interface ZoneData {
  radius_km: number;
  polygon: ZonePoint[];
}

interface CorridorData {
  nominal_range_km: number;
  half_width_km: number;
  centerline: ZonePoint[];
  left_boundary: ZonePoint[];
  right_boundary: ZonePoint[];
}

interface SafetyZoneResponse {
  pad: { lat: number; lon: number; name: string; id: string };
  vehicle_class: string;
  zones: {
    restricted: ZoneData;
    warning: ZoneData;
    caution: ZoneData;
    advisory: ZoneData;
  };
  corridor?: CorridorData;
}

const ZONES = [
  { key: "advisory",   label: "Advisory",   fill: "rgba(34,197,94,0.12)",   stroke: "#22c55e",  strokeW: 1.5, text: "#4ade80" },
  { key: "caution",    label: "Caution",    fill: "rgba(234,179,8,0.18)",   stroke: "#eab308",  strokeW: 1.5, text: "#fde047" },
  { key: "warning",    label: "Warning",    fill: "rgba(249,115,22,0.28)",  stroke: "#f97316",  strokeW: 2,   text: "#fb923c" },
  { key: "restricted", label: "Restricted", fill: "rgba(239,68,68,0.42)",   stroke: "#ef4444",  strokeW: 2,   text: "#f87171" },
] as const;

interface Props {
  data: SafetyZoneResponse | null;
  loading?: boolean;
}

export function SafetyCanvas({ data, loading }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    // HiDPI / retina support
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth  || 480;
    const H = canvas.offsetHeight || 340;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = "#060c1a";
    ctx.fillRect(0, 0, W, H);

    // Subtle grid
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    const gridStep = 40;
    for (let x = 0; x < W; x += gridStep) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += gridStep) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Bounding box from all points
    const allPts: ZonePoint[] = [
      ...data.zones.restricted.polygon,
      ...data.zones.warning.polygon,
      ...data.zones.caution.polygon,
      ...data.zones.advisory.polygon,
    ];
    if (data.corridor) allPts.push(...data.corridor.left_boundary, ...data.corridor.right_boundary);

    const lats = allPts.map(p => p.lat);
    const lons = allPts.map(p => p.lon);
    let minLat = Math.min(...lats), maxLat = Math.max(...lats);
    let minLon = Math.min(...lons), maxLon = Math.max(...lons);

    const latRange = maxLat - minLat || 0.01;
    const lonRange = maxLon - minLon || 0.01;
    const PAD = 0.13;
    minLat -= latRange * PAD; maxLat += latRange * PAD;
    minLon -= lonRange * PAD; maxLon += lonRange * PAD;

    const project = (lat: number, lon: number): [number, number] => [
      ((lon - minLon) / (maxLon - minLon)) * W,
      H - ((lat - minLat) / (maxLat - minLat)) * H,
    ];

    const drawPolygon = (points: ZonePoint[], fill: string, stroke: string, lw: number) => {
      if (points.length < 3) return;
      ctx.beginPath();
      const [sx, sy] = project(points[0].lat, points[0].lon);
      ctx.moveTo(sx, sy);
      for (let i = 1; i < points.length; i++) {
        const [px, py] = project(points[i].lat, points[i].lon);
        ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw;
      ctx.stroke();
    };

    // Draw zones outermost → innermost
    for (const z of ZONES) {
      drawPolygon(
        data.zones[z.key].polygon,
        z.fill,
        z.stroke,
        z.strokeW,
      );
    }

    // Radius labels on each zone ring (at top of ellipse, 90° = straight up)
    for (const z of ZONES) {
      const pts = data.zones[z.key].polygon;
      if (pts.length < 3) continue;
      // find the topmost point (min Y in canvas coords = max lat)
      let topI = 0;
      let minY = Infinity;
      for (let i = 0; i < pts.length; i++) {
        const [, py] = project(pts[i].lat, pts[i].lon);
        if (py < minY) { minY = py; topI = i; }
      }
      const [lx, ly] = project(pts[topI].lat, pts[topI].lon);
      const km = data.zones[z.key].radius_km;
      const label = km >= 1 ? `${km} km` : `${Math.round(km * 1000)} m`;

      ctx.font = "bold 10px monospace";
      const tw = ctx.measureText(label).width;
      // pill background
      ctx.fillStyle = "rgba(6,12,26,0.80)";
      ctx.beginPath();
      ctx.roundRect(lx - tw / 2 - 5, ly - 16, tw + 10, 16, 4);
      ctx.fill();
      ctx.fillStyle = z.text;
      ctx.fillText(label, lx - tw / 2, ly - 4);
    }

    // Corridor
    if (data.corridor) {
      const { left_boundary, right_boundary, centerline } = data.corridor;
      const corridorPoly = [...left_boundary, ...[...right_boundary].reverse()];
      if (corridorPoly.length > 0) {
        ctx.beginPath();
        const [sx, sy] = project(corridorPoly[0].lat, corridorPoly[0].lon);
        ctx.moveTo(sx, sy);
        for (let i = 1; i < corridorPoly.length; i++) {
          const [px, py] = project(corridorPoly[i].lat, corridorPoly[i].lon);
          ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = "rgba(34,211,238,0.08)";
        ctx.fill();
        ctx.strokeStyle = "rgba(34,211,238,0.55)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      // Centerline dashes
      if (centerline.length > 1) {
        ctx.beginPath();
        const [sx, sy] = project(centerline[0].lat, centerline[0].lon);
        ctx.moveTo(sx, sy);
        for (let i = 1; i < centerline.length; i++) {
          const [px, py] = project(centerline[i].lat, centerline[i].lon);
          ctx.lineTo(px, py);
        }
        ctx.strokeStyle = "rgba(34,211,238,0.80)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Pad marker — glowing dot
    const [padX, padY] = project(data.pad.lat, data.pad.lon);
    // outer glow
    const grd = ctx.createRadialGradient(padX, padY, 2, padX, padY, 18);
    grd.addColorStop(0, "rgba(34,211,238,0.45)");
    grd.addColorStop(1, "rgba(34,211,238,0)");
    ctx.beginPath();
    ctx.arc(padX, padY, 18, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
    // ring
    ctx.beginPath();
    ctx.arc(padX, padY, 7, 0, Math.PI * 2);
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 2;
    ctx.stroke();
    // centre dot
    ctx.beginPath();
    ctx.arc(padX, padY, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // Pad name
    const padName = data.pad.name || data.pad.id.replace(/_/g, " ").toUpperCase();
    ctx.font = "bold 11px monospace";
    const nw = ctx.measureText(padName).width;
    ctx.fillStyle = "rgba(6,12,26,0.80)";
    ctx.beginPath();
    ctx.roundRect(padX + 12, padY - 9, nw + 10, 16, 4);
    ctx.fill();
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(padName, padX + 17, padY + 3);

    // Legend (bottom-left)
    const LX = 10, LY0 = H - 12 - ZONES.length * 20;
    // legend background
    ctx.fillStyle = "rgba(6,12,26,0.75)";
    ctx.beginPath();
    ctx.roundRect(LX - 4, LY0 - 14, 104, ZONES.length * 20 + 10, 6);
    ctx.fill();
    ctx.font = "11px monospace";
    ZONES.forEach((z, i) => {
      const ly = LY0 + i * 20;
      // swatch
      ctx.fillStyle = z.fill;
      ctx.fillRect(LX, ly - 9, 13, 13);
      ctx.strokeStyle = z.stroke;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(LX, ly - 9, 13, 13);
      // label
      ctx.fillStyle = z.text;
      ctx.fillText(z.label, LX + 18, ly + 1);
    });
  }, [data]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-white/10" style={{ background: "#060c1a" }}>
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "340px" }}
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="flex items-center gap-2 text-cyan-400 text-sm">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Calculating zones…
          </div>
        </div>
      )}
      {!data && !loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-slate-500 text-sm">Configure parameters to preview safety zones</p>
        </div>
      )}
    </div>
  );
}
