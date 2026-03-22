"""
RK4 Trajectory Propagator — heliocentric two-body dynamics.

Integrates the equations of motion:
    d²r/dt² = -μ/|r|³ · r

using classical Runge-Kutta 4th-order method.
Optional J2 oblateness perturbation for Earth-centric legs.
"""

from __future__ import annotations

import math
from typing import List

import numpy as np

# ── Constants ─────────────────────────────────────────────────────────────────
GM_SUN   = 1.32712440018e11   # km³/s²
GM_EARTH = 3.986004418e5
GM_MOON  = 4.9048695e3
GM_MARS  = 4.282837e4
GM_VENUS = 3.24858592e5

J2_EARTH = 1.08262668e-3     # Earth oblateness coefficient
R_EARTH  = 6378.137           # km

_GM_MAP = {
    "sun": GM_SUN, "earth": GM_EARTH,
    "moon": GM_MOON, "mars": GM_MARS, "venus": GM_VENUS,
}


# ── Equations of motion ───────────────────────────────────────────────────────

def _accel_two_body(r: np.ndarray, mu: float) -> np.ndarray:
    """Point-mass gravitational acceleration (km/s²)."""
    r_mag = np.linalg.norm(r)
    if r_mag < 1.0:
        raise ValueError(f"Singularity: |r| = {r_mag:.3f} km")
    return -mu / r_mag**3 * r


def _accel_j2(r: np.ndarray, mu: float, j2: float, r_eq: float) -> np.ndarray:
    """J2 oblateness perturbation acceleration (km/s²)."""
    x, y, z = r
    r_mag = np.linalg.norm(r)
    factor = -1.5 * j2 * mu * r_eq**2 / r_mag**5
    z_ratio = (z / r_mag) ** 2
    ax = factor * x * (1.0 - 5.0 * z_ratio)
    ay = factor * y * (1.0 - 5.0 * z_ratio)
    az = factor * z * (3.0 - 5.0 * z_ratio)
    return np.array([ax, ay, az])


def _state_deriv(
    state: np.ndarray, mu: float, j2: bool = False
) -> np.ndarray:
    """
    State vector derivative: [r, v] → [v, a].
    state = [x, y, z, vx, vy, vz]
    """
    r = state[:3]
    v = state[3:]
    a = _accel_two_body(r, mu)
    if j2:
        a += _accel_j2(r, mu, J2_EARTH, R_EARTH)
    return np.concatenate([v, a])


# ── RK4 step ──────────────────────────────────────────────────────────────────

def _rk4_step(
    state: np.ndarray, dt: float, mu: float, j2: bool
) -> np.ndarray:
    """Single RK4 integration step."""
    k1 = _state_deriv(state,                mu, j2)
    k2 = _state_deriv(state + 0.5 * dt * k1, mu, j2)
    k3 = _state_deriv(state + 0.5 * dt * k2, mu, j2)
    k4 = _state_deriv(state + dt * k3,        mu, j2)
    return state + (dt / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4)


# ── Public API ────────────────────────────────────────────────────────────────

def propagate_trajectory(
    r0: list[float],
    v0: list[float],
    tof_days: float,
    body: str = "sun",
    n_points: int = 200,
    use_j2: bool = False,
) -> List[dict]:
    """
    Propagate an initial state [r0 (km), v0 (km/s)] for tof_days using RK4.

    Parameters
    ----------
    r0        : initial position vector [x, y, z] km
    v0        : initial velocity vector [vx, vy, vz] km/s
    tof_days  : propagation duration in days
    body      : central body name
    n_points  : number of output points (equally spaced in time)
    use_j2    : include J2 oblateness (Earth leg only)

    Returns
    -------
    List of dicts: {x, y, z (km), t (s), vx, vy, vz (km/s), r (km)}
    """
    mu = _GM_MAP.get(body.lower(), GM_SUN)
    tof_s = tof_days * 86400.0
    dt_out = tof_s / max(n_points - 1, 1)

    # Adaptive substep: cap at 600 s for accuracy
    substeps = max(1, math.ceil(dt_out / 600.0))
    dt_inner = dt_out / substeps

    state = np.array(r0 + v0, dtype=float)
    points: List[dict] = []
    t = 0.0

    for i in range(n_points):
        r_vec = state[:3]
        v_vec = state[3:]
        points.append({
            "x": float(r_vec[0]),
            "y": float(r_vec[1]),
            "z": float(r_vec[2]),
            "t": float(t),
            "vx": float(v_vec[0]),
            "vy": float(v_vec[1]),
            "vz": float(v_vec[2]),
            "r_km": float(np.linalg.norm(r_vec)),
        })
        if i < n_points - 1:
            for _ in range(substeps):
                state = _rk4_step(state, dt_inner, mu, use_j2)
            t += dt_out

    return points


def heliocentric_position(body: str, epoch_jd: float) -> np.ndarray:
    """
    Approximate heliocentric ecliptic position (km) of a solar-system body
    using mean orbital elements valid near J2000 (±50 years).

    Source: Standish, E.M. (1992) — simplified 2-term series.
    """
    # Semi-major axis (AU), eccentricity, mean motion (deg/day), mean anomaly @ J2000
    elements = {
        "earth": (1.00000011, 0.01671022, 0.985608,  100.46435),
        "moon":  (0.00257,    0.0549,    13.176358,    0.0),     # geocentric → add Earth
        "mars":  (1.52366231, 0.09341233, 0.524039,  355.45332),
        "venus": (0.72333199, 0.00677323, 1.602130,  181.97973),
    }
    AU_KM = 1.495978707e8

    key = body.lower()
    if key == "sun":
        return np.zeros(3)

    if key not in elements:
        raise ValueError(f"Unknown body: {body}")

    a_au, e, n_dday, M0_deg = elements[key]
    dt_days = epoch_jd - 2451545.0         # days since J2000.0
    M_rad = math.radians(M0_deg + n_dday * dt_days)

    # Solve Kepler's equation — Newton–Raphson
    E = M_rad
    for _ in range(50):
        dE = (M_rad - (E - e * math.sin(E))) / (1.0 - e * math.cos(E))
        E += dE
        if abs(dE) < 1e-12:
            break

    # True anomaly
    nu = 2.0 * math.atan2(
        math.sqrt(1 + e) * math.sin(E / 2.0),
        math.sqrt(1 - e) * math.cos(E / 2.0),
    )

    r_au = a_au * (1.0 - e * math.cos(E))
    r_km = r_au * AU_KM

    # Simplified: place in ecliptic plane (ω=0, Ω=0, i=0 approximation)
    x = r_km * math.cos(nu)
    y = r_km * math.sin(nu)
    z = 0.0

    return np.array([x, y, z])
