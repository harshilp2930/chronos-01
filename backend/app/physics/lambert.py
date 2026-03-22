"""
Lambert's Problem Solver — Izzo (2015) universal variable formulation.

Given two position vectors r1, r2 (km) and a time-of-flight tof (s),
compute the required departure velocity v1 and arrival velocity v2.

Reference: D. Izzo, "Revisiting Lambert's problem",
           Celestial Mechanics and Dynamical Astronomy, 2015.
"""

from __future__ import annotations

import math
from typing import Tuple

import numpy as np

# ── Gravitational parameters (km³/s²) ────────────────────────────────────────
GM = {
    "sun":   1.32712440018e11,
    "earth": 3.986004418e5,
    "moon":  4.9048695e3,
    "mars":  4.282837e4,
    "venus": 3.24858592e5,
}


def _stumpff_c(z: float) -> float:
    """Stumpff function C(z)."""
    if z > 1e-6:
        return (1.0 - math.cos(math.sqrt(z))) / z
    elif z < -1e-6:
        return (math.cosh(math.sqrt(-z)) - 1.0) / (-z)
    return 0.5 - z / 24.0


def _stumpff_s(z: float) -> float:
    """Stumpff function S(z)."""
    if z > 1e-6:
        sq = math.sqrt(z)
        return (sq - math.sin(sq)) / (z * sq)
    elif z < -1e-6:
        sq = math.sqrt(-z)
        return (math.sinh(sq) - sq) / (-z * sq)
    return 1.0 / 6.0 - z / 120.0


def _lambert_universal(
    r1_vec: np.ndarray,
    r2_vec: np.ndarray,
    tof: float,
    mu: float,
    prograde: bool = True,
    max_iter: int = 50,
    tol: float = 1e-10,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Solve Lambert's problem using universal variables (Battin / Bate method).

    Parameters
    ----------
    r1_vec, r2_vec : position vectors in km
    tof            : time of flight in seconds
    mu             : gravitational parameter in km³/s²
    prograde       : True for prograde (short-way) transfer
    max_iter       : Newton–Raphson iteration limit
    tol            : convergence tolerance

    Returns
    -------
    v1, v2 : departure and arrival velocity vectors (km/s)
    """
    if tof <= 0:
        raise ValueError("Time of flight must be positive.")

    r1 = np.linalg.norm(r1_vec)
    r2 = np.linalg.norm(r2_vec)

    cos_dnu = np.dot(r1_vec, r2_vec) / (r1 * r2)
    cos_dnu = np.clip(cos_dnu, -1.0, 1.0)

    cross = np.cross(r1_vec, r2_vec)
    if prograde:
        dm = 1.0 if cross[2] >= 0 else -1.0
    else:
        dm = -1.0 if cross[2] >= 0 else 1.0

    sin_dnu = dm * math.sqrt(max(0.0, 1.0 - cos_dnu**2))

    A = dm * math.sqrt(r1 * r2 * (1.0 + cos_dnu))
    if abs(A) < 1e-10:
        raise ValueError("Degenerate Lambert problem (r1, r2 aligned).")

    # Initial guess for z
    z = 0.0
    for _ in range(max_iter):
        B = _stumpff_s(z)
        C = _stumpff_c(z)

        y = r1 + r2 + A * (z * B - 1.0) / math.sqrt(C)
        if A > 0 and y < 0:
            # Adjust z upward
            z += 0.1
            continue

        sqy = math.sqrt(abs(y))
        x = sqy / math.sqrt(C)

        # Compute t(z)
        t_z = (x**3 * B + A * sqy) / math.sqrt(mu)

        # Derivative dt/dz
        if abs(z) > 1e-6:
            dt_dz = (
                x**3 * (B / (2.0 * z) - 3.0 * B**2 / (2.0 * C))
                + A / 8.0 * (3.0 * B * sqy / C + A / x)
            ) / math.sqrt(mu)
        else:
            dt_dz = math.sqrt(2.0) / 40.0 * y**1.5 / math.sqrt(mu) + A / 8.0 * (
                sqy + A * math.sqrt(1.0 / (2.0 * y))
            ) / math.sqrt(mu)

        dz = (tof - t_z) / dt_dz
        z += dz
        if abs(dz) < tol:
            break

    # Lagrange coefficients
    B = _stumpff_s(z)
    C = _stumpff_c(z)
    y = r1 + r2 + A * (z * B - 1.0) / math.sqrt(C)
    sqy = math.sqrt(abs(y))
    x = sqy / math.sqrt(C)

    f = 1.0 - y / r1
    gdot = 1.0 - y / r2
    g = A * math.sqrt(y / mu)

    v1 = (r2_vec - f * r1_vec) / g
    v2 = (gdot * r2_vec - r1_vec) / g

    return v1, v2


def solve_lambert(
    r1_vec: np.ndarray,
    r2_vec: np.ndarray,
    tof_days: float,
    body: str = "sun",
    prograde: bool = True,
) -> dict:
    """
    Public API for the Lambert solver.

    Parameters
    ----------
    r1_vec    : departure position (km) in heliocentric / body-centric frame
    r2_vec    : arrival position (km)
    tof_days  : time of flight in days
    body      : gravitational body ('sun', 'earth', …)
    prograde  : prograde transfer

    Returns
    -------
    dict with v1, v2 (km/s arrays), delta_v magnitudes (km/s), tof_days
    """
    mu = GM.get(body.lower(), GM["sun"])
    tof_s = tof_days * 86400.0

    v1, v2 = _lambert_universal(r1_vec, r2_vec, tof_s, mu, prograde=prograde)

    # Circular orbit velocities at departure and arrival (for Δv calc)
    r1 = np.linalg.norm(r1_vec)
    r2 = np.linalg.norm(r2_vec)
    v_circ_dep = math.sqrt(mu / r1)
    v_circ_arr = math.sqrt(mu / r2)

    # Hyperbolic excess velocities relative to circular orbits
    dv1 = float(np.linalg.norm(v1) - v_circ_dep)
    dv2 = float(abs(np.linalg.norm(v2) - v_circ_arr))

    return {
        "v1_km_s": v1.tolist(),
        "v2_km_s": v2.tolist(),
        "delta_v_departure_km_s": abs(dv1),
        "delta_v_arrival_km_s": dv2,
        "total_delta_v_km_s": abs(dv1) + dv2,
        "tof_days": tof_days,
    }
