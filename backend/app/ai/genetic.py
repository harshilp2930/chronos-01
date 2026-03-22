"""
Genetic Algorithm — Launch Window Optimizer.

Searches a date range for the minimum total Δv transfer window between
Earth and a target body using a real-valued genetic algorithm.

Chromosome: [launch_jd]   (single decision variable — arrival is
            determined by the fixed transfer time derived from Hohmann
            approximation ± perturbation, then refined)
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import List, Optional

import numpy as np

from app.physics.lambert import solve_lambert
from app.physics.propagator import heliocentric_position


# ── Epoch utilities ───────────────────────────────────────────────────────────

_J2000_EPOCH = date(2000, 1, 1)
_JD_J2000    = 2451545.0                         # Julian Date of J2000.0


def _date_to_jd(d: date) -> float:
    """Convert a calendar date to Julian Date (approx, J2000 base)."""
    delta = (d - _J2000_EPOCH).days
    return _JD_J2000 + delta


def _jd_to_date(jd: float) -> date:
    """Convert Julian Date back to calendar date."""
    delta_days = int(round(jd - _JD_J2000))
    return _J2000_EPOCH + timedelta(days=delta_days)


# ── Hohmann / porkchop helpers ────────────────────────────────────────────────

# Approximate Hohmann transfer time (days) pre-computed for common targets
_HOHMANN_DAYS = {
    "moon":  4.0,
    "mars":  259.0,
    "venus": 146.0,
}

# Transfer time search window (±fraction of Hohmann estimate)
_TOF_SEARCH_FRAC = 0.35


def _tof_bounds(target: str) -> tuple[float, float]:
    h = _HOHMANN_DAYS.get(target.lower(), 180.0)
    return h * (1.0 - _TOF_SEARCH_FRAC), h * (1.0 + _TOF_SEARCH_FRAC)


# ── Fitness function ──────────────────────────────────────────────────────────

def _delta_v_cost(
    launch_jd: float,
    tof_days: float,
    target: str,
) -> float:
    """
    Compute total Δv (km/s) for a given launch epoch and time-of-flight.
    Returns a large penalty on failure.
    """
    try:
        r1 = heliocentric_position("earth", launch_jd)
        r2 = heliocentric_position(target, launch_jd + tof_days)
        result = solve_lambert(r1, r2, tof_days, body="sun", prograde=True)
        return result["total_delta_v_km_s"]
    except Exception:
        return 99.0         # penalty for degenerate geometries


def _evaluate(chromosome: "Chromosome", target: str) -> float:
    """Fitness = negative Δv — lower Δv is better so we minimise."""
    launch_jd = chromosome.genes[0]
    tof_days  = chromosome.genes[1]
    return _delta_v_cost(launch_jd, tof_days, target)


# ── Chromosome ────────────────────────────────────────────────────────────────

@dataclass
class Chromosome:
    genes: List[float]              # [launch_jd, tof_days]
    fitness: float = field(default=math.inf, init=False)

    def evaluate(self, target: str) -> None:
        self.fitness = _evaluate(self, target)


# ── GA operators ──────────────────────────────────────────────────────────────

def _random_chromosome(
    jd_min: float, jd_max: float, tof_min: float, tof_max: float
) -> Chromosome:
    return Chromosome([
        random.uniform(jd_min, jd_max),
        random.uniform(tof_min, tof_max),
    ])


def _tournament_select(
    population: List[Chromosome], k: int = 3
) -> Chromosome:
    """k-tournament selection — returns the fittest of k random individuals."""
    candidates = random.sample(population, k)
    return min(candidates, key=lambda c: c.fitness)


def _blend_crossover(
    p1: Chromosome, p2: Chromosome, alpha: float = 0.3
) -> tuple["Chromosome", "Chromosome"]:
    """BLX-α crossover for real-valued chromosomes."""
    child1_genes, child2_genes = [], []
    for g1, g2 in zip(p1.genes, p2.genes):
        lo, hi = min(g1, g2), max(g1, g2)
        d = hi - lo
        lo_c = lo - alpha * d
        hi_c = hi + alpha * d
        child1_genes.append(random.uniform(lo_c, hi_c))
        child2_genes.append(random.uniform(lo_c, hi_c))
    return Chromosome(child1_genes), Chromosome(child2_genes)


def _gaussian_mutation(
    chrom: Chromosome,
    mutation_rate: float,
    jd_range: float,
    tof_range: float,
) -> Chromosome:
    """Gaussian perturbation mutation."""
    new_genes = list(chrom.genes)
    sigmas = [jd_range * 0.03, tof_range * 0.05]
    for i in range(len(new_genes)):
        if random.random() < mutation_rate:
            new_genes[i] += random.gauss(0, sigmas[i])
    return Chromosome(new_genes)


def _clamp_chromosome(
    chrom: Chromosome,
    jd_min: float, jd_max: float,
    tof_min: float, tof_max: float,
) -> None:
    """Clamp genes to feasible bounds in-place."""
    chrom.genes[0] = max(jd_min, min(jd_max, chrom.genes[0]))
    chrom.genes[1] = max(tof_min, min(tof_max, chrom.genes[1]))


# ── Main optimiser ────────────────────────────────────────────────────────────

def optimize_launch_window(
    target: str,
    earliest_date: date,
    latest_date: date,
    population_size: int = 60,
    generations: int = 80,
    elite_frac: float = 0.10,
    crossover_prob: float = 0.80,
    mutation_rate: float = 0.15,
    seed: Optional[int] = None,
) -> dict:
    """
    Find optimal launch windows using a real-valued genetic algorithm.

    Parameters
    ----------
    target          : 'moon' | 'mars' | 'venus'
    earliest_date   : search window start
    latest_date     : search window end
    population_size : GA population size
    generations     : number of GA generations
    elite_frac      : fraction of population preserved via elitism
    crossover_prob  : crossover probability
    mutation_rate   : per-gene mutation probability
    seed            : random seed for reproducibility

    Returns
    -------
    dict with best window, top-5 windows, convergence history.
    """
    if seed is not None:
        random.seed(seed)
        np.random.seed(seed)

    target = target.lower()
    jd_min = _date_to_jd(earliest_date)
    jd_max = _date_to_jd(latest_date)

    if jd_max <= jd_min:
        raise ValueError("latest_date must be after earliest_date.")

    tof_min, tof_max = _tof_bounds(target)
    jd_range  = jd_max - jd_min
    tof_range = tof_max - tof_min

    # ── Initialise population ────────────────────────────────────────────────
    population: List[Chromosome] = [
        _random_chromosome(jd_min, jd_max, tof_min, tof_max)
        for _ in range(population_size)
    ]
    for c in population:
        c.evaluate(target)

    population.sort(key=lambda c: c.fitness)

    n_elite = max(1, int(elite_frac * population_size))
    best_fitness_history: List[float] = []

    # ── Evolve ──────────────────────────────────────────────────────────────
    for gen in range(generations):
        elite = population[:n_elite]
        new_pop: List[Chromosome] = list(elite)

        while len(new_pop) < population_size:
            p1 = _tournament_select(population)
            if random.random() < crossover_prob:
                p2 = _tournament_select(population)
                c1, c2 = _blend_crossover(p1, p2)
            else:
                c1, c2 = Chromosome(list(p1.genes)), Chromosome(list(p1.genes))

            for child in (c1, c2):
                child = _gaussian_mutation(child, mutation_rate, jd_range, tof_range)
                _clamp_chromosome(child, jd_min, jd_max, tof_min, tof_max)
                child.evaluate(target)
                new_pop.append(child)
                if len(new_pop) >= population_size:
                    break

        population = sorted(new_pop, key=lambda c: c.fitness)[:population_size]
        best_fitness_history.append(round(population[0].fitness, 6))

    # ── Format top-5 results ─────────────────────────────────────────────────
    seen_jds: set = set()
    top_windows: List[dict] = []

    for chrom in population:
        if len(top_windows) >= 5:
            break
        # De-duplicate within ±3 days
        jd = chrom.genes[0]
        too_close = any(abs(jd - s) < 3.0 for s in seen_jds)
        if too_close:
            continue
        seen_jds.add(jd)
        launch_dt  = _jd_to_date(jd)
        tof_days   = chrom.genes[1]
        arrival_dt = _jd_to_date(jd + tof_days)
        top_windows.append({
            "rank": len(top_windows) + 1,
            "launch_date": str(launch_dt),
            "arrival_date": str(arrival_dt),
            "tof_days": round(tof_days, 1),
            "total_delta_v_km_s": round(chrom.fitness, 4),
            "launch_jd": round(jd, 2),
        })

    best = top_windows[0] if top_windows else {}

    return {
        "target": target.capitalize(),
        "search_range": {
            "earliest": str(earliest_date),
            "latest": str(latest_date),
        },
        "ga_params": {
            "population_size": population_size,
            "generations": generations,
            "elite_frac": elite_frac,
        },
        "best_window": best,
        "top_windows": top_windows,
        "convergence_history": best_fitness_history,
    }
