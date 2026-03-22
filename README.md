<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:070b14,50:1a2d4a,100:4f8ef7&height=200&section=header&text=CHRONOS-1&fontSize=80&fontColor=ffffff&fontAlignY=38&desc=Mission%20Intelligence%20Optimizer&descAlignY=60&descSize=20&descColor=4f8ef7&animation=fadeIn" width="100%"/>

<br/>

<p>
  <img src="https://img.shields.io/badge/Status-Active%20Development-22c55e?style=for-the-badge&logo=rocket&logoColor=white"/>
  <img src="https://img.shields.io/badge/Model-Random%20Forest-4f8ef7?style=for-the-badge&logo=scikit-learn&logoColor=white"/>
  <img src="https://img.shields.io/badge/Accuracy-95.01%25-06b6d4?style=for-the-badge&logo=checkmarx&logoColor=white"/>
  <img src="https://img.shields.io/badge/ROC--AUC-0.9551-a855f7?style=for-the-badge&logo=chartdotjs&logoColor=white"/>
</p>

<p>
  <img src="https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/FastAPI-0.100-009688?style=flat-square&logo=fastapi&logoColor=white"/>
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white"/>
  <img src="https://img.shields.io/badge/Three.js-r128-black?style=flat-square&logo=three.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/scikit--learn-1.3-F7931E?style=flat-square&logo=scikit-learn&logoColor=white"/>
  <img src="https://img.shields.io/badge/License-Coming%20Soon-475569?style=flat-square"/>
</p>

<br/>

> **AI-powered weather scrub risk prediction for ISRO launches.**  
> Chronos-1 combines mission planning, simulation, and a hybrid weather scrub model
> to deliver actionable GO / NO-GO decision support for SDSC, VSSC, and Abdul Kalam Island.

<br/>

</div>

---

## What is Chronos-1?

**Chronos-1** is a full-stack mission intelligence platform with:

- a **FastAPI backend** for mission workflows, simulation, safety checks, and analytics,
- a **Next.js frontend** for planner/officer dashboards and interactive visuals,
- an **ML weather scrub model** that predicts launch scrub risk using coastal weather features and LWCC-style overrides.

It is designed around the three major ISRO launch locations:
**SDSC Sriharikota**, **VSSC Trivandrum**, and **Abdul Kalam Island**.

```text
Weather Data -> ML Assessment -> Rule Validation -> GO / NO-GO Decision
   (8 params)      (RF model)      (hard overrides)      (API response)
```

---

## Key Features

| Feature | Description |
|---|---|
| Hybrid ML Model | Random Forest based scrub-risk prediction pipeline (`ml/step1..3`) |
| Real-Time Prediction API | `POST /api/v1/scrub/predict` with typed validation and risk response |
| Mission Management | Full mission lifecycle (create, update, submit, approve, reject, export PDF) |
| Role-Based Access | JWT auth with officer/planner/individual flows |
| Physics Tooling | Lambert solver, propagation, safety-zone checks, optimization endpoints |
| 3D UI Experience | Next.js + Three.js visuals (Earth/solar system effects and dashboards) |
| Launch-Site Coverage | `sdsc`, `vssc`, `aki` support in weather/scrub flow |

---

## Model Performance

<div align="center">

| Metric | Score |
|:---:|:---:|
| Test Accuracy | 95.01% |
| ROC-AUC | 0.9551 |
| Avg Precision | 0.9550 |
| F1 Macro | 0.9451 |
| CV Stability | +/-0.008 |

</div>

> Metrics are from current model/report artifacts in `ml/`.

---

## Architecture

```text
chronos-01/
|- backend/                    # FastAPI app, auth, missions, analytics, physics APIs
|  |- main.py
|  |- app/
|  |  |- api/
|  |  |  |- auth.py
|  |  |  |- missions.py
|  |  |  |- users.py
|  |  |  |- analytics.py
|  |  |  |- simulation.py
|  |  |  |- safety.py
|  |  |  |- optimization.py
|  |  |  `- scrub.py
|  |  |- ai/
|  |  |- physics/
|  |  |- models/
|  |  `- schemas/
|  `- tests/
|- frontend/                   # Next.js 14 app (landing + planner/officer dashboards)
|  |- app/
|  |- components/
|  |- lib/
|  `- store/
`- ml/                         # Training data, model training, prediction scripts
   |- step1_generate_data.py
   |- step2_train_model.py
   |- step3_predict.py
   `- data/weather_labelled.csv
```

---

## Quick Start

### Prerequisites

```bash
node   >= 18
python >= 3.10
npm    >= 9
```

### 1. Clone

```bash
git clone https://github.com/harshilp2930/chronos-01.git
cd chronos-01
```

### 2. Backend setup

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt

# Optional: seed demo users and sample data
python seed_demo_data.py

# Start API
uvicorn main:app --reload --port 8000
```

Backend endpoints:

- Docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

- App: `http://localhost:3000`

### 4. Optional model regeneration

From repository root:

```bash
python ml/step1_generate_data.py
python ml/step2_train_model.py
```

---

## API Reference

### Weather Scrub

- `POST /api/v1/scrub/predict`

Request body:

```json
{
  "wind_speed_kmh": 12.5,
  "wind_gust_kmh": 18.0,
  "visibility_km": 22.0,
  "cloud_ceiling_ft": 8000,
  "temperature_c": 28.5,
  "precipitation_mm_h": 0.2,
  "lightning_distance_km": 99.0,
  "humidity_pct": 72.0,
  "site_id": "sdsc"
}
```

### Core Platform APIs

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/missions/`
- `POST /api/missions/`
- `POST /api/missions/{mission_id}/submit`
- `POST /api/missions/{mission_id}/approve`
- `POST /api/missions/{mission_id}/reject`
- `GET /api/missions/{mission_id}/export-pdf`
- `GET /api/analytics/planner`
- `GET /api/analytics/officer`

---

## Launch Sites

| Site ID | Name | Coordinates |
|:---:|---|:---:|
| `sdsc` | Satish Dhawan Space Centre (Sriharikota) | 13.7N, 80.2E |
| `vssc` | Vikram Sarabhai Space Centre (Trivandrum) | 8.5N, 76.9E |
| `aki` | Abdul Kalam Island | 15.1N, 82.9E |

---

## LWCC-Style Guardrails

Chronos-1 applies deterministic weather checks in addition to ML probability.
When a hard rule is violated, response can be forced to **NO-GO**.

Typical rule dimensions include:

- wind speed and gusts
- visibility
- cloud ceiling
- precipitation
- lightning distance

---

## Roadmap

```text
Phase 1 - Backend Foundation           [done]
Phase 2 - Physics + Scrub Intelligence [done]
Phase 3 - Rich Frontend Experience     [in progress]
Phase 4 - Production Hardening         [planned]
```

---

## Contributing

```bash
# 1. Create branch
git checkout -b feature/your-feature

# 2. Commit
git commit -m "feat: add your feature"

# 3. Push
git push origin feature/your-feature
```

Commit tags:

```text
feat  fix  docs  style  refactor  ml  ui
```

---

## Environment Variables

Use `backend/.env.example` as baseline.

Example backend values:

```bash
ENVIRONMENT=development
FRONTEND_URL=http://localhost:3000
DATABASE_URL=sqlite:///./chronos1.db
SECRET_KEY=change-me
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

Example frontend values:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## License

No formal OSS license has been added yet.
All rights reserved unless a license is published in this repository.

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:4f8ef7,50:1a2d4a,100:070b14&height=120&section=footer&animation=fadeIn" width="100%"/>

**Built for mission confidence: Predict. Assess. Launch.**

SDSC - VSSC - AKI - CHRONOS-1

</div>
