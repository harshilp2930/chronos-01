"""
step1_generate_data.py
======================
Generates a realistic synthetic dataset that mimics real Open-Meteo
distributions for Indian coastal launch sites, then auto-labels using
LWCC rules + soft risk scoring.

Run this first. Output → ml/data/weather_labelled.csv
"""

import numpy as np
import pandas as pd
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

FEATURE_NAMES = [
    "wind_speed_kmh", "wind_gust_kmh", "visibility_km",
    "cloud_ceiling_ft", "temperature_c", "precipitation_mm_h",
    "lightning_distance_km", "humidity_pct",
]

KNOWN_LAUNCHES = [
    # (date, hour_IST, scrubbed, site_id)  — from Wikipedia ISRO mission list
    ("2023-10-21",  6, False, "sdsc"),  # Aditya-L1
    ("2023-07-14",  2, False, "sdsc"),  # Chandrayaan-3
    ("2023-03-26", 22, False, "sdsc"),  # OneWeb India-3
    ("2022-10-23", 18, False, "sdsc"),  # OneWeb India-2
    ("2022-06-30", 18, False, "sdsc"),  # PSLV-C53
    ("2022-02-14",  5, False, "sdsc"),  # PSLV-C52
    ("2021-08-12",  5, False, "sdsc"),  # EOS-03 (scrubbed T-56 min — technical, not weather)
    ("2021-02-28",  3, False, "sdsc"),  # Amazonia-1
    ("2020-11-07",  9, False, "sdsc"),  # CMS-01
    ("2019-11-27",  3, False, "sdsc"),  # CARTOSAT-3
    ("2019-07-22",  9, False, "sdsc"),  # Chandrayaan-2
    ("2019-04-01",  3, False, "sdsc"),  # EMISAT
]


def simulate_realistic_weather(n: int = 6000, seed: int = 0) -> pd.DataFrame:
    """
    Simulate weather with realistic Indian coastal distributions.
    Includes monsoon seasonality effect.
    """
    rng = np.random.default_rng(seed)

    # Day-of-year for seasonality (monsoon = days 150-270)
    doy = rng.integers(1, 365, n)
    monsoon = ((doy >= 150) & (doy <= 270)).astype(float)

    # Wind: higher during monsoon
    wind_base = rng.weibull(2.0, n) * 16.0
    wind_speed = wind_base + monsoon * rng.uniform(0, 20, n)
    wind_gust  = wind_speed * rng.uniform(1.1, 1.7, n)

    # Visibility: drops during monsoon/rain
    visibility = np.clip(
        rng.normal(22, 9, n) - monsoon * rng.uniform(0, 15, n),
        0.1, 60.0
    )

    # Cloud ceiling: lower during monsoon
    cloud_ceiling = np.clip(
        rng.exponential(5000, n) - monsoon * rng.uniform(0, 4000, n),
        0, 30000
    )

    # Temperature: Indian coastal range
    temperature = rng.normal(28, 6, n)

    # Precipitation: heavy during monsoon
    precip_base = rng.exponential(0.8, n)
    precip = np.clip(precip_base + monsoon * rng.exponential(4.0, n), 0, 60)

    # Lightning: more during monsoon
    lightning = np.clip(
        rng.exponential(60, n) - monsoon * rng.uniform(0, 40, n),
        0.5, 300
    )

    # Humidity: high year-round, peaks in monsoon
    humidity = np.clip(rng.normal(72, 13, n) + monsoon * 8, 20, 100)

    df = pd.DataFrame({
        "wind_speed_kmh":        wind_speed,
        "wind_gust_kmh":         wind_gust,
        "visibility_km":         visibility,
        "cloud_ceiling_ft":      cloud_ceiling,
        "temperature_c":         temperature,
        "precipitation_mm_h":    precip,
        "lightning_distance_km": lightning,
        "humidity_pct":          humidity,
        "doy":                   doy,
        "monsoon":               monsoon,
    })
    return df


def auto_label_lwcc(df: pd.DataFrame) -> pd.DataFrame:
    """Apply LWCC hard + soft rules to generate scrub labels."""
    # Hard violations → always scrub
    hard = (
        (df["wind_speed_kmh"] > 50) |
        (df["wind_gust_kmh"] > 70) |
        (df["visibility_km"] < 5) |
        (df["cloud_ceiling_ft"] < 2500) |
        (df["precipitation_mm_h"] > 3.0) |
        (df["lightning_distance_km"] < 10)
    )

    # Soft risk score (0–5)
    soft_score = (
        (df["wind_speed_kmh"] > 35).astype(int) +
        (df["precipitation_mm_h"] > 1.0).astype(int) +
        (df["visibility_km"] < 10).astype(int) +
        (df["cloud_ceiling_ft"] < 5000).astype(int) +
        (df["humidity_pct"] > 85).astype(int)
    )

    scrub = (hard | (soft_score >= 3)).astype(int)

    # 4% label noise for robustness
    rng = np.random.default_rng(99)
    noise_idx = rng.choice(len(df), size=int(0.04 * len(df)), replace=False)
    scrub.iloc[noise_idx] ^= 1

    df = df.copy()
    df["scrub_label"] = scrub
    df["label_source"] = "lwcc_rule"
    return df


def inject_known_launches(df: pd.DataFrame) -> pd.DataFrame:
    """
    Inject rows for known ISRO launches as confirmed GO (scrub=0).
    These act as ground-truth anchors.
    """
    rows = []
    for date_str, hour_ist, scrubbed, site_id in KNOWN_LAUNCHES:
        # Approximate typical clear launch-day weather
        rows.append({
            "wind_speed_kmh":        np.random.uniform(5, 20),
            "wind_gust_kmh":         np.random.uniform(10, 30),
            "visibility_km":         np.random.uniform(12, 40),
            "cloud_ceiling_ft":      np.random.uniform(4000, 20000),
            "temperature_c":         np.random.uniform(22, 32),
            "precipitation_mm_h":    np.random.uniform(0, 0.5),
            "lightning_distance_km": np.random.uniform(30, 200),
            "humidity_pct":          np.random.uniform(55, 78),
            "doy":                   0,
            "monsoon":               0,
            "scrub_label":           int(scrubbed),
            "label_source":          f"known_launch_{site_id}_{date_str}",
        })

    anchors = pd.DataFrame(rows)
    return pd.concat([df, anchors], ignore_index=True)


if __name__ == "__main__":
    print("Step 1: Generating hybrid labelled dataset...")

    df = simulate_realistic_weather(n=6000)
    df = auto_label_lwcc(df)
    df = inject_known_launches(df)

    out = DATA_DIR / "weather_labelled.csv"
    df.to_csv(out, index=False)

    scrub_pct = df["scrub_label"].mean() * 100
    print(f"  Total rows  : {len(df):,}")
    print(f"  Scrub rate  : {scrub_pct:.1f}%")
    print(f"  GO launches : {(df['label_source'].str.startswith('known')).sum()}")
    print(f"  Saved       → {out}")
    print("Done. Run step2_train_model.py next.")
