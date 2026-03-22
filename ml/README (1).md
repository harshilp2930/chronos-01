# ISRO Launch Weather Scrub Risk — Hybrid ML Pipeline

## Folder Structure

```
ml/
├── step1_generate_data.py   ← Generate hybrid labelled dataset
├── step2_train_model.py     ← Train model + compare vs baseline
├── step3_predict.py         ← Make real predictions
├── data/
│   └── weather_labelled.csv (created by step1)
├── hybrid_model.pkl         (created by step2)
└── reports/
    └── comparison_report.png (created by step2)
```

## Quick Start (run in order)

```bash
pip install scikit-learn numpy pandas matplotlib seaborn requests

python step1_generate_data.py
python step2_train_model.py

# Single manual prediction
python step3_predict.py --mode single

# Live weather prediction (needs internet)
python step3_predict.py --mode live --site sdsc

# Batch prediction from CSV
python step3_predict.py --mode batch --input my_weather.csv
```

## Sites Supported

| ID   | Name               | Lat     | Lon     |
| ---- | ------------------ | ------- | ------- |
| sdsc | Sriharikota        | 13.70°N | 80.23°E |
| vssc | Trivandrum         | 8.51°N  | 76.94°E |
| aki  | Abdul Kalam Island | 15.07°N | 82.88°E |

## Model Features (8 inputs)

| Feature               | Unit | LWCC Limit     |
| --------------------- | ---- | -------------- |
| wind_speed_kmh        | km/h | > 50 → NO-GO   |
| wind_gust_kmh         | km/h | > 70 → NO-GO   |
| visibility_km         | km   | < 5 → NO-GO    |
| cloud_ceiling_ft      | ft   | < 2500 → NO-GO |
| temperature_c         | °C   | —              |
| precipitation_mm_h    | mm/h | > 3 → NO-GO    |
| lightning_distance_km | km   | < 10 → NO-GO   |
| humidity_pct          | %    | —              |

## Improving Labels (Week 2)

1. Go to https://en.wikipedia.org/wiki/List_of_ISRO_missions
2. Note all launch dates + outcomes
3. Add entries to `KNOWN_LAUNCHES` in step1_generate_data.py
4. Re-run step1 → step2 to retrain with more ground-truth anchors

## Live Weather Upgrade

When Open-Meteo is accessible, `step3_predict.py --mode live`
automatically fetches real-time conditions for any site.

## Next Steps

- Add a Flask/FastAPI web interface around step3_predict.py
- Schedule a cron job to fetch weather every hour before launch windows
- Integrate IMD radar data for real lightning distance
