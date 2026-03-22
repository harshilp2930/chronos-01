"""
step3_predict.py
================
Load the trained hybrid model and make real predictions.
Supports single prediction, batch CSV, and live weather fetch.

Usage examples
--------------
  # Single prediction (manual weather inputs)
  python step3_predict.py --mode single

  # Batch prediction from a CSV
  python step3_predict.py --mode batch --input my_weather.csv

  # Live weather for SDSC right now (requires internet)
  python step3_predict.py --mode live --site sdsc
"""

import argparse
import pickle
import sys
from datetime import datetime

import numpy as np
import pandas as pd

FEATURE_COLS = [
    "wind_speed_kmh", "wind_gust_kmh", "visibility_km",
    "cloud_ceiling_ft", "temperature_c", "precipitation_mm_h",
    "lightning_distance_km", "humidity_pct",
]

SITES = {
    "sdsc": {"name": "Sriharikota",         "lat": 13.70, "lon": 80.23},
    "vssc": {"name": "Trivandrum",           "lat":  8.51, "lon": 76.94},
    "aki":  {"name": "Abdul Kalam Island",   "lat": 15.07, "lon": 82.88},
}

LWCC = {
    "wind_speed_kmh":        ("gt", 50.0,  "Wind speed exceeds 50 km/h"),
    "wind_gust_kmh":         ("gt", 70.0,  "Wind gust exceeds 70 km/h"),
    "visibility_km":         ("lt",  5.0,  "Visibility below 5 km"),
    "cloud_ceiling_ft":      ("lt", 2500,  "Ceiling below 2500 ft"),
    "precipitation_mm_h":    ("gt",  3.0,  "Precipitation > 3 mm/h"),
    "lightning_distance_km": ("lt", 10.0,  "Lightning within 10 km"),
}


def load_model(path="ml/hybrid_model.pkl"):
    with open(path, "rb") as f:
        bundle = pickle.load(f)
    return bundle["model"], bundle["scaler"]


def risk_level(prob):
    if prob < 0.15: return "🟢 Nominal"
    if prob < 0.35: return "🟡 Low"
    if prob < 0.60: return "🟠 Moderate"
    if prob < 0.80: return "🔴 High"
    return "🚨 Critical"


def check_lwcc(row: dict) -> list[str]:
    violations = []
    for col, (op, limit, label) in LWCC.items():
        val = row.get(col, 0.0)
        if (op == "gt" and val > limit) or (op == "lt" and val < limit):
            violations.append(label)
    return violations


def predict_one(model, scaler, features: dict, site_id="sdsc") -> dict:
    X = np.array([[features[c] for c in FEATURE_COLS]])
    X_s = scaler.transform(X)
    proba = model.predict_proba(X_s)[0]
    classes = list(model.classes_)
    scrub_prob = float(proba[classes.index(1)] if 1 in classes else 0.0)

    violations = check_lwcc(features)
    if violations and scrub_prob < 0.65:
        scrub_prob = max(scrub_prob, 0.65)   # hard override

    go_no_go = "✅ GO" if (scrub_prob < 0.50 and not violations) else "❌ NO-GO"
    importances = dict(zip(FEATURE_COLS, model.feature_importances_))
    top_factor  = max(importances, key=importances.get)

    return {
        "site":              SITES.get(site_id, {}).get("name", site_id),
        "timestamp":         datetime.now().strftime("%Y-%m-%d %H:%M IST"),
        "scrub_probability": round(scrub_prob * 100, 1),
        "risk_level":        risk_level(scrub_prob),
        "go_no_go":          go_no_go,
        "lwcc_violations":   violations if violations else ["None"],
        "top_factor":        top_factor,
        "input_conditions":  features,
    }


def print_result(result: dict):
    print("\n" + "═" * 52)
    print(f"  ISRO LAUNCH WEATHER ASSESSMENT")
    print(f"  Site      : {result['site']}")
    print(f"  Time      : {result['timestamp']}")
    print("═" * 52)
    print(f"  Decision        : {result['go_no_go']}")
    print(f"  Scrub Prob      : {result['scrub_probability']}%")
    print(f"  Risk Level      : {result['risk_level']}")
    print(f"  Top Risk Factor : {result['top_factor']}")
    print(f"\n  LWCC Violations :")
    for v in result["lwcc_violations"]:
        print(f"    • {v}")
    print("═" * 52)


def fetch_live_weather(site_id: str) -> dict:
    """Fetch live weather from Open-Meteo for a site."""
    import urllib.request, json
    site = SITES[site_id]
    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={site['lat']}&longitude={site['lon']}"
        f"&current_weather=true"
        f"&hourly=relativehumidity_2m,visibility,precipitation,"
        f"windgusts_10m,cloudcover"
        f"&forecast_days=1&timezone=Asia/Kolkata"
    )
    with urllib.request.urlopen(url, timeout=15) as r:
        data = json.loads(r.read())

    cw = data["current_weather"]
    hourly = data["hourly"]

    # Use first hour's values for humidity, visibility, etc.
    return {
        "wind_speed_kmh":        cw["windspeed"],
        "wind_gust_kmh":         hourly["windgusts_10m"][0] or cw["windspeed"] * 1.4,
        "visibility_km":         (hourly["visibility"][0] or 10000) / 1000,
        "cloud_ceiling_ft":      max(0, (100 - (hourly["cloudcover"][0] or 50)) / 100 * 25000),
        "temperature_c":         cw["temperature"],
        "precipitation_mm_h":    hourly["precipitation"][0] or 0.0,
        "lightning_distance_km": 99.0,   # not available from Open-Meteo
        "humidity_pct":          hourly["relativehumidity_2m"][0] or 70.0,
    }


def mode_single(model, scaler):
    print("\nEnter current weather conditions:")
    features = {}
    prompts = {
        "wind_speed_kmh":        ("Wind speed (km/h)", 10.0),
        "wind_gust_kmh":         ("Wind gust (km/h)",  15.0),
        "visibility_km":         ("Visibility (km)",   20.0),
        "cloud_ceiling_ft":      ("Cloud ceiling (ft)", 8000),
        "temperature_c":         ("Temperature (°C)",  28.0),
        "precipitation_mm_h":    ("Precipitation (mm/h)", 0.0),
        "lightning_distance_km": ("Lightning distance (km, 99=none)", 99.0),
        "humidity_pct":          ("Humidity (%)",      70.0),
    }
    for col, (label, default) in prompts.items():
        raw = input(f"  {label} [{default}]: ").strip()
        features[col] = float(raw) if raw else default

    site_id = input("  Site (sdsc/vssc/aki) [sdsc]: ").strip() or "sdsc"
    result  = predict_one(model, scaler, features, site_id)
    print_result(result)


def mode_live(model, scaler, site_id="sdsc"):
    print(f"\nFetching live weather for {SITES[site_id]['name']}...")
    try:
        features = fetch_live_weather(site_id)
        print("  Weather fetched:")
        for k, v in features.items():
            print(f"    {k:<28} = {v:.2f}")
        result = predict_one(model, scaler, features, site_id)
        print_result(result)
    except Exception as e:
        print(f"  Live fetch failed: {e}")
        print("  Use --mode single to enter conditions manually.")


def mode_batch(model, scaler, input_csv: str):
    df = pd.read_csv(input_csv)
    missing = [c for c in FEATURE_COLS if c not in df.columns]
    if missing:
        print(f"Missing columns: {missing}")
        sys.exit(1)

    results = []
    for _, row in df.iterrows():
        features = {c: row[c] for c in FEATURE_COLS}
        site_id  = row.get("site_id", "sdsc")
        r = predict_one(model, scaler, features, site_id)
        results.append({
            "site":             r["site"],
            "go_no_go":         r["go_no_go"],
            "scrub_probability": r["scrub_probability"],
            "risk_level":       r["risk_level"],
            "violations":       "; ".join(r["lwcc_violations"]),
        })

    out_df = pd.DataFrame(results)
    out_path = input_csv.replace(".csv", "_predictions.csv")
    out_df.to_csv(out_path, index=False)
    print(out_df.to_string(index=False))
    print(f"\nSaved → {out_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode",  choices=["single","live","batch"], default="single")
    parser.add_argument("--site",  default="sdsc")
    parser.add_argument("--input", default=None)
    args = parser.parse_args()

    model, scaler = load_model()

    if args.mode == "single":
        mode_single(model, scaler)
    elif args.mode == "live":
        mode_live(model, scaler, args.site)
    elif args.mode == "batch":
        if not args.input:
            print("--input required for batch mode")
            sys.exit(1)
        mode_batch(model, scaler, args.input)
