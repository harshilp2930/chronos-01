"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Html } from "@react-three/drei";
import * as THREE from "three";

// Real sidereal orbital periods in Earth days
const ORBITAL_PERIODS_DAYS: Record<"mercury" | "venus" | "earth" | "mars" | "jupiter" | "saturn", number> = {
  mercury: 87.97,
  venus: 224.7,
  earth: 365.25,
  mars: 686.97,
  jupiter: 4332.59,
  saturn: 10759.22,
};

const ORBIT_RADIUS_AU: Record<"mercury" | "venus" | "earth" | "mars" | "jupiter" | "saturn", number> = {
  mercury: 0.387,
  venus: 0.723,
  earth: 1.0,
  mars: 1.524,
  jupiter: 5.203,
  saturn: 9.537,
};

const MOON_PERIOD_DAYS = 27.32;
const MOON_RADIUS_UNITS = 0.72;
const SIM_DAYS_PER_SECOND_DEFAULT = 10;
const BASE_SIM_DATE = new Date("2025-07-14T00:00:00Z");

const EARTH_ORBIT_UNITS = 5;
const AU_TO_UNITS = EARTH_ORBIT_UNITS / 1.0;

type PlanetKey = keyof typeof ORBIT_RADIUS_AU;

type BodyConfig = {
  key: PlanetKey;
  name: string;
  radiusUnits: number;
  periodDays: number;
  size: number;
  color: string;
  initialAngle: number;
};

const PLANETS: BodyConfig[] = [
  {
    key: "mercury",
    name: "Mercury",
    radiusUnits: ORBIT_RADIUS_AU.mercury * AU_TO_UNITS,
    periodDays: ORBITAL_PERIODS_DAYS.mercury,
    size: 0.12,
    color: "#9ca3af",
    initialAngle: 0.6,
  },
  {
    key: "venus",
    name: "Venus",
    radiusUnits: ORBIT_RADIUS_AU.venus * AU_TO_UNITS,
    periodDays: ORBITAL_PERIODS_DAYS.venus,
    size: 0.22,
    color: "#dfc47c",
    initialAngle: 1.2,
  },
  {
    key: "earth",
    name: "Earth",
    radiusUnits: ORBIT_RADIUS_AU.earth * AU_TO_UNITS,
    periodDays: ORBITAL_PERIODS_DAYS.earth,
    size: 0.28,
    color: "#2563b0",
    initialAngle: 0,
  },
  {
    key: "mars",
    name: "Mars",
    radiusUnits: ORBIT_RADIUS_AU.mars * AU_TO_UNITS,
    periodDays: ORBITAL_PERIODS_DAYS.mars,
    size: 0.2,
    color: "#c84c1e",
    initialAngle: 2.1,
  },
  {
    key: "jupiter",
    name: "Jupiter",
    radiusUnits: ORBIT_RADIUS_AU.jupiter * AU_TO_UNITS,
    periodDays: ORBITAL_PERIODS_DAYS.jupiter,
    size: 0.52,
    color: "#b98a64",
    initialAngle: 2.8,
  },
  {
    key: "saturn",
    name: "Saturn",
    radiusUnits: ORBIT_RADIUS_AU.saturn * AU_TO_UNITS,
    periodDays: ORBITAL_PERIODS_DAYS.saturn,
    size: 0.45,
    color: "#d9be88",
    initialAngle: 3.35,
  },
];

const PLANET_BY_KEY: Record<PlanetKey, BodyConfig> = PLANETS.reduce(
  (acc, body) => {
    acc[body.key] = body;
    return acc;
  },
  {} as Record<PlanetKey, BodyConfig>,
);

function getAngularSpeed(periodDays: number, simScale: number): number {
  return ((2 * Math.PI) / periodDays) * simScale;
}

function angleAtTime(periodDays: number, simTimeDays: number, initialAngle: number): number {
  return ((2 * Math.PI) / periodDays) * simTimeDays + initialAngle;
}

function planetPositionAtAngle(radiusUnits: number, angle: number): THREE.Vector3 {
  return new THREE.Vector3(radiusUnits * Math.cos(angle), 0, radiusUnits * Math.sin(angle));
}

function hohmannTransferDays(fromPlanet: PlanetKey, toPlanet: PlanetKey): number {
  const r1Au = ORBIT_RADIUS_AU[fromPlanet];
  const r2Au = ORBIT_RADIUS_AU[toPlanet];
  const aAu = (r1Au + r2Au) / 2;
  const tYears = 0.5 * Math.sqrt(Math.pow(aAu, 3));
  return tYears * 365.25;
}

function targetArrivalAngle(targetPlanet: PlanetKey, currentAngle: number, transferDays: number): number {
  return currentAngle + ((2 * Math.PI) / ORBITAL_PERIODS_DAYS[targetPlanet]) * transferDays;
}

function hohmannDeltaV(fromPlanet: PlanetKey, toPlanet: PlanetKey): number {
  const GM_SUN = 1.327e11;
  const r1 = ORBIT_RADIUS_AU[fromPlanet] * 1.496e8;
  const r2 = ORBIT_RADIUS_AU[toPlanet] * 1.496e8;
  const a = (r1 + r2) / 2;

  const v1Circ = Math.sqrt(GM_SUN / r1);
  const v1Trans = Math.sqrt(GM_SUN * (2 / r1 - 1 / a));
  const dv1 = Math.abs(v1Trans - v1Circ);

  const v2Circ = Math.sqrt(GM_SUN / r2);
  const v2Trans = Math.sqrt(GM_SUN * (2 / r2 - 1 / a));
  const dv2 = Math.abs(v2Circ - v2Trans);

  return dv1 + dv2;
}

function generateHohmannArc(
  fromPlanet: PlanetKey,
  toPlanet: PlanetKey,
  departureAngle: number,
  auToUnits: number,
): { geometry: THREE.BufferGeometry; points: THREE.Vector3[]; semiMajorUnits: number } {
  const r1 = ORBIT_RADIUS_AU[fromPlanet] * auToUnits;
  const r2 = ORBIT_RADIUS_AU[toPlanet] * auToUnits;

  const a = (r1 + r2) / 2;
  const b = Math.sqrt(r1 * r2);
  const c = a - r1;

  const points: THREE.Vector3[] = [];
  const SEGMENTS = 128;

  for (let i = 0; i <= SEGMENTS; i++) {
    const t = (i / SEGMENTS) * Math.PI;
    const xLocal = a * Math.cos(t) - c;
    const zLocal = b * Math.sin(t);

    const x = xLocal * Math.cos(departureAngle) - zLocal * Math.sin(departureAngle);
    const z = xLocal * Math.sin(departureAngle) + zLocal * Math.cos(departureAngle);

    points.push(new THREE.Vector3(x, 0, z));
  }

  return {
    geometry: new THREE.BufferGeometry().setFromPoints(points),
    points,
    semiMajorUnits: a,
  };
}

function formatSimDate(baseDate: Date, simDays: number): string {
  const d = new Date(baseDate.getTime() + simDays * 24 * 60 * 60 * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day} + ${Math.floor(simDays)} days`;
}

function OrbitRing({ radius }: { radius: number }) {
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = 240;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * 2 * Math.PI;
      points.push(new THREE.Vector3(radius * Math.cos(a), 0, radius * Math.sin(a)));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [radius]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    // @ts-expect-error three intrinsic typing
    <line geometry={geometry}>
      <lineBasicMaterial color="#ffffff" transparent opacity={0.06} />
    </line>
  );
}

function Sun() {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    matRef.current.emissiveIntensity = 2.2 + Math.sin(clock.getElapsedTime() * 1.4) * 0.35;
  });

  return (
    <group>
      <pointLight color="#ffe8a0" intensity={4.4} distance={95} decay={1.35} />
      <mesh>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshStandardMaterial
          ref={matRef}
          color="#fdb813"
          emissive="#fdb813"
          emissiveIntensity={2.4}
          roughness={0.45}
        />
      </mesh>
      <Html center distanceFactor={14} style={{ pointerEvents: "none", userSelect: "none" }}>
        <span
          style={{
            display: "block",
            marginTop: "44px",
            fontSize: "9px",
            fontFamily: "monospace",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "rgba(253,184,19,0.65)",
            whiteSpace: "nowrap",
          }}
        >
          Sun
        </span>
      </Html>
    </group>
  );
}

function AnimatedPlanet({
  body,
  simTimeDaysRef,
  isTarget,
  posRef,
}: {
  body: BodyConfig;
  simTimeDaysRef: RefObject<number>;
  isTarget: boolean;
  posRef?: RefObject<THREE.Vector3>;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const simDays = simTimeDaysRef.current ?? 0;
    const angle = angleAtTime(body.periodDays, simDays, body.initialAngle);
    const position = planetPositionAtAngle(body.radiusUnits, angle);

    if (groupRef.current) groupRef.current.position.copy(position);
    if (posRef?.current) posRef.current.copy(position);
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[body.size, 32, 32]} />
        <meshStandardMaterial
          color={body.color}
          roughness={0.68}
          metalness={0.08}
          emissive={isTarget ? body.color : "#000000"}
          emissiveIntensity={isTarget ? 0.28 : 0}
        />
      </mesh>

      {body.key === "earth" && (
        <mesh position={[body.size * 1.08, 0, 0]}>
          <sphereGeometry args={[0.024, 10, 10]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={3.4} />
        </mesh>
      )}

      <Html center distanceFactor={12} style={{ pointerEvents: "none", userSelect: "none" }}>
        <span
          style={{
            display: "block",
            marginTop: `${body.size * 56 + 12}px`,
            fontSize: "8.5px",
            fontFamily: "monospace",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: isTarget ? "rgba(34,211,238,0.9)" : "rgba(148,163,184,0.68)",
            fontWeight: isTarget ? "700" : "400",
            whiteSpace: "nowrap",
          }}
        >
          {body.name}
        </span>
      </Html>
    </group>
  );
}

function Moon({
  earthPosRef,
  simTimeDaysRef,
  isTarget,
}: {
  earthPosRef: RefObject<THREE.Vector3>;
  simTimeDaysRef: RefObject<number>;
  isTarget: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const simDays = simTimeDaysRef.current ?? 0;
    const angle = angleAtTime(MOON_PERIOD_DAYS, simDays, 0.5);
    const local = new THREE.Vector3(MOON_RADIUS_UNITS * Math.cos(angle), 0, MOON_RADIUS_UNITS * Math.sin(angle));
    const earthPos = earthPosRef.current ?? new THREE.Vector3();
    if (groupRef.current) groupRef.current.position.copy(earthPos.clone().add(local));
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[0.09, 24, 24]} />
        <meshStandardMaterial
          color="#8a8a96"
          roughness={0.7}
          emissive={isTarget ? "#8a8a96" : "#000000"}
          emissiveIntensity={isTarget ? 0.25 : 0}
        />
      </mesh>
      <Html center distanceFactor={12} style={{ pointerEvents: "none", userSelect: "none" }}>
        <span
          style={{
            display: "block",
            marginTop: "20px",
            fontSize: "8px",
            fontFamily: "monospace",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: isTarget ? "rgba(34,211,238,0.9)" : "rgba(148,163,184,0.62)",
            whiteSpace: "nowrap",
          }}
        >
          Moon
        </span>
      </Html>
    </group>
  );
}

function HohmannTransfer({
  fromPlanet,
  toPlanet,
  departureAngle,
  targetAngleAtDeparture,
  missionProgress,
}: {
  fromPlanet: PlanetKey;
  toPlanet: PlanetKey;
  departureAngle: number;
  targetAngleAtDeparture: number;
  missionProgress: number;
}) {
  const { geometry, points } = useMemo(
    () => generateHohmannArc(fromPlanet, toPlanet, departureAngle, AU_TO_UNITS),
    [fromPlanet, toPlanet, departureAngle],
  );

  const transferDays = useMemo(() => hohmannTransferDays(fromPlanet, toPlanet), [fromPlanet, toPlanet]);

  const markerAngle = targetArrivalAngle(toPlanet, targetAngleAtDeparture, transferDays);
  const markerPos = useMemo(() => {
    const r = ORBIT_RADIUS_AU[toPlanet] * AU_TO_UNITS;
    return new THREE.Vector3(r * Math.cos(markerAngle), 0, r * Math.sin(markerAngle));
  }, [markerAngle, toPlanet]);

  const shipRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!shipRef.current || points.length === 0) return;
    const t = Math.max(0, Math.min(1, missionProgress / 100));
    const idx = Math.min(points.length - 1, Math.floor(t * (points.length - 1)));
    shipRef.current.position.copy(points[idx]);
  });

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <>
      {/* @ts-expect-error three intrinsic typing */}
      <line geometry={geometry}>
        <lineBasicMaterial color={0x06b6d4} transparent opacity={0.85} />
      </line>

      {points[0] && (
        <mesh position={points[0]}>
          <sphereGeometry args={[0.1, 14, 14]} />
          <meshBasicMaterial color={0x22c55e} />
        </mesh>
      )}

      <mesh position={markerPos}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color={0x22c55e} />
      </mesh>

      <Html position={[markerPos.x, markerPos.y + 0.35, markerPos.z]} distanceFactor={10} style={{ pointerEvents: "none" }}>
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "8px",
            color: "#22c55e",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          Arrival
        </span>
      </Html>

      <mesh ref={shipRef}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshBasicMaterial color={0x22d3ee} />
      </mesh>
    </>
  );
}

function Scene({
  target,
  trajectoryPoints,
  simScale,
  paused,
  onSimTimeChange,
  missionStartDays,
  missionProgress,
}: {
  target: string;
  trajectoryPoints?: Array<{ x: number; y: number; z: number }>;
  simScale: number;
  paused: boolean;
  onSimTimeChange: (days: number) => void;
  missionStartDays: number;
  missionProgress: number;
}) {
  void trajectoryPoints;
  const simTimeDaysRef = useRef(0);
  const publishAccumulatorRef = useRef(0);

  const earthPosRef = useRef(new THREE.Vector3(PLANET_BY_KEY.earth.radiusUnits, 0, 0));

  const targetKey = target.toLowerCase();
  const missionTarget = (Object.keys(ORBIT_RADIUS_AU) as PlanetKey[]).includes(targetKey as PlanetKey)
    ? (targetKey as PlanetKey)
    : null;

  const departureAngle = useMemo(() => {
    const earthCfg = PLANET_BY_KEY.earth;
    return angleAtTime(earthCfg.periodDays, missionStartDays, earthCfg.initialAngle);
  }, [missionStartDays]);

  const targetAngleAtDeparture = useMemo(() => {
    if (!missionTarget || missionTarget === "earth") return 0;
    const cfg = PLANET_BY_KEY[missionTarget];
    return angleAtTime(cfg.periodDays, missionStartDays, cfg.initialAngle);
  }, [missionStartDays, missionTarget]);

  useFrame((_, delta) => {
    if (!paused) {
      simTimeDaysRef.current += delta * simScale;
    }

    publishAccumulatorRef.current += delta;
    if (publishAccumulatorRef.current >= 0.15) {
      publishAccumulatorRef.current = 0;
      onSimTimeChange(simTimeDaysRef.current);
    }
  });

  return (
    <>
      <ambientLight intensity={0.08} />
      <Stars radius={110} depth={58} count={7200} factor={4} saturation={0} fade />
      <Sun />

      {PLANETS.map((body) => (
        <group key={body.key}>
          <OrbitRing radius={body.radiusUnits} />
          <AnimatedPlanet
            body={body}
            simTimeDaysRef={simTimeDaysRef}
            posRef={body.key === "earth" ? earthPosRef : undefined}
            isTarget={targetKey === body.key}
          />
        </group>
      ))}

      <Moon earthPosRef={earthPosRef} simTimeDaysRef={simTimeDaysRef} isTarget={targetKey === "moon"} />

      {missionTarget && missionTarget !== "earth" && targetKey !== "moon" && (
        <HohmannTransfer
          fromPlanet="earth"
          toPlanet={missionTarget}
          departureAngle={departureAngle}
          targetAngleAtDeparture={targetAngleAtDeparture}
          missionProgress={missionProgress}
        />
      )}

      <OrbitControls enablePan minDistance={3.5} maxDistance={62} autoRotate autoRotateSpeed={0.15} />
    </>
  );
}

export interface SolarSystemViewerProps {
  target: string;
  trajectoryPoints?: Array<{ x: number; y: number; z: number }>;
  height?: number;
}

export function SolarSystemViewer({
  target,
  trajectoryPoints,
  height = 500,
}: SolarSystemViewerProps) {
  const [simScale, setSimScale] = useState(SIM_DAYS_PER_SECOND_DEFAULT);
  const [paused, setPaused] = useState(false);
  const [simTimeDays, setSimTimeDays] = useState(0);
  const [missionStartDays, setMissionStartDays] = useState(0);
  const [trackedTarget, setTrackedTarget] = useState(target);

  const targetKey = target.toLowerCase();
  const missionTarget = (Object.keys(ORBIT_RADIUS_AU) as PlanetKey[]).includes(targetKey as PlanetKey)
    ? (targetKey as PlanetKey)
    : null;

  const handleSimTimeChange = (days: number) => {
    setSimTimeDays(days);
    if (target !== trackedTarget) {
      setTrackedTarget(target);
      setMissionStartDays(days);
    }
  };

  const activeMission = !!missionTarget && missionTarget !== "earth";
  const transferDays = activeMission ? hohmannTransferDays("earth", missionTarget) : 0;
  const semiMajorAU = activeMission ? (ORBIT_RADIUS_AU.earth + ORBIT_RADIUS_AU[missionTarget]) / 2 : 0;
  const deltaV = activeMission ? hohmannDeltaV("earth", missionTarget) : 0;

  const missionProgress =
    activeMission && transferDays > 0
      ? Math.max(0, Math.min(100, ((simTimeDays - missionStartDays) / transferDays) * 100))
      : 0;

  const departureDate = formatSimDate(BASE_SIM_DATE, missionStartDays);
  const arrivalDate = formatSimDate(BASE_SIM_DATE, missionStartDays + transferDays);
  const simDate = formatSimDate(BASE_SIM_DATE, simTimeDays);

  const earthPeriodSeconds = ORBITAL_PERIODS_DAYS.earth / Math.max(simScale, 1);
  const marsPeriodSeconds = ORBITAL_PERIODS_DAYS.mars / Math.max(simScale, 1);

  const earthAngularSpeed = getAngularSpeed(ORBITAL_PERIODS_DAYS.earth, simScale);
  const marsAngularSpeed = getAngularSpeed(ORBITAL_PERIODS_DAYS.mars, simScale);

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-black"
      style={{ height: `${height}px` }}
    >
      <Canvas
        camera={{ position: [12, 11, 18], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "#000004" }}
      >
        <Scene
          target={target}
          trajectoryPoints={trajectoryPoints}
          simScale={simScale}
          paused={paused}
          missionStartDays={missionStartDays}
          missionProgress={missionProgress}
          onSimTimeChange={handleSimTimeChange}
        />
      </Canvas>

      <div className="absolute top-3 right-3 z-10 min-w-50 rounded-lg border border-slate-700 bg-black/50 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-cyan-400">TIME SCALE</span>
          <span className="font-mono text-xs text-white">{simScale}x</span>
        </div>

        <input
          type="range"
          min={1}
          max={365}
          step={1}
          value={simScale}
          onChange={(e) => setSimScale(Number(e.target.value))}
          className="mt-2 h-1 w-full accent-cyan-400"
        />

        <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-500">
          <span>1 day/s</span>
          <span>1 yr/s</span>
        </div>

        <div className="mt-2 text-center font-mono text-xs text-slate-300">📅 {simDate}</div>

        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="mt-2 w-full rounded border border-slate-700 px-2 py-1 font-mono text-xs text-slate-400 transition-colors hover:text-white"
        >
          {paused ? "▶ RESUME" : "⏸ PAUSE"}
        </button>

        <div className="mt-2 border-t border-slate-800 pt-2 font-mono text-[10px] text-slate-500">
          <div className="flex justify-between">
            <span>Earth orbit:</span>
            <span>{earthPeriodSeconds.toFixed(2)}s</span>
          </div>
          <div className="flex justify-between">
            <span>Earth ω:</span>
            <span>{earthAngularSpeed.toFixed(4)} rad/s</span>
          </div>
          <div className="flex justify-between">
            <span>Mars orbit:</span>
            <span>{marsPeriodSeconds.toFixed(2)}s</span>
          </div>
          <div className="flex justify-between">
            <span>Mars ω:</span>
            <span>{marsAngularSpeed.toFixed(4)} rad/s</span>
          </div>
        </div>
      </div>

      {activeMission && (
        <div className="absolute bottom-3 left-3 z-10 rounded-lg border border-cyan-900 bg-black/60 px-4 py-3 font-mono text-xs backdrop-blur">
          <p className="mb-2 font-bold text-cyan-400">🛸 TRANSFER: EARTH → {missionTarget.toUpperCase()}</p>

          <div className="flex flex-col gap-1 text-slate-300">
            <div className="flex justify-between gap-8">
              <span className="text-slate-500">Departure</span>
              <span>{departureDate}</span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-slate-500">Transfer time</span>
              <span>{Math.round(transferDays)} days</span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-slate-500">Arrival</span>
              <span>{arrivalDate}</span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-slate-500">Semi-major axis</span>
              <span>{semiMajorAU.toFixed(3)} AU</span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-slate-500">Delta-v (approx)</span>
              <span>{deltaV.toFixed(2)} km/s</span>
            </div>
          </div>

          <div className="mt-2 border-t border-slate-800 pt-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
              <span className="text-slate-400">Spacecraft in transit</span>
              <span className="ml-auto text-cyan-300">{Math.round(missionProgress)}%</span>
            </div>
            <div className="mt-1 h-1 w-full rounded bg-slate-800">
              <div
                className="h-1 rounded bg-cyan-400 transition-all"
                style={{ width: `${missionProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
