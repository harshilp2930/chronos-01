# Chronos-1

Chronos-1 is a full-stack mission intelligence platform for space launch planning and review. It combines a FastAPI backend, a Next.js frontend, orbital mechanics utilities, a weather scrub risk model, analytics dashboards, PDF mission reporting, and an ARIA assistant for mission-focused chat and mission creation.

## System Overview

Chronos-1 is built around three operating ideas:

- planners create and refine missions
- officers review, approve, or reject submitted missions
- the system enriches those decisions with trajectory, safety, weather, and analytics signals

Supported launch sites:

- `sdsc` - Satish Dhawan Space Centre, Sriharikota
- `vssc` - Vikram Sarabhai Space Centre, Trivandrum
- `aki` - Abdul Kalam Island

Supported target bodies:

- `moon`
- `mars`
- `venus`

Supported vehicle classes:

- `sounding`
- `sslv`
- `pslv`
- `gslv2`
- `lvm3`

## Major Capabilities

- Mission lifecycle management: draft, submit, approve, reject, update, delete
- Role-aware dashboards for officer, planner, and individual users
- Automatic trajectory generation for supported targets during mission creation/update
- Lambert transfer and propagation utilities for simulation workflows
- Weather scrub risk scoring backed by a trained hybrid model
- LWCC-style deterministic guardrails layered on top of probabilistic risk
- Planner and officer analytics endpoints for operational visibility
- PDF export for mission reports
- ARIA assistant for space-ops Q&A and mission creation from chat
- Interactive frontend visuals including mission views and solar-system style displays

## Architecture

```text
chronos-01/
|- backend/                     FastAPI API, auth, missions, analytics, physics, scrub model integration
|- frontend/                    Next.js app router frontend, dashboards, ARIA UI, internal API routes
|- ml/                          Data generation, model training, inference scripts, report artifacts
`- README.md                    Root system guide
```

Request flow at a high level:

```text
Frontend UI -> Next.js app -> FastAPI backend -> DB / Physics / Analytics / ML
                    |
                    `-> /api/aria -> Gemini API (server-side only)
```

## Backend

The backend lives in `backend/main.py` and exposes the primary API surface.

Core backend responsibilities:

- authentication and JWT-based access control
- mission CRUD and approval workflow
- mission simulation and trajectory generation
- weather scrub scoring and weather-related endpoints
- analytics for planners and officers
- mission PDF export
- startup-time scrub model preparation and loading

Key route groups:

- `/api/auth/*`
- `/api/missions/*`
- `/api/users/*`
- `/api/analytics/*`
- `/api/simulation/*`
- `/api/safety/*`
- `/api/optimization/*`
- `/api/v1/scrub/*`
- `/api/v1/weather/*`
- `/health`
- `/docs`

Implementation areas:

- `backend/app/api/` - REST endpoints
- `backend/app/models/` - SQLAlchemy models
- `backend/app/schemas/` - Pydantic schemas
- `backend/app/core/` - config, database, security
- `backend/app/physics/` - Lambert, propagation, safety calculations
- `backend/app/ai/` - scrub model and optimization helpers
- `backend/tests/` - API tests

## Frontend

The frontend lives under `frontend/` and is a Next.js App Router application.

Core frontend responsibilities:

- authentication screens and token-based session handling
- planner and officer dashboards
- mission forms and mission detail views
- analytics and reference pages
- ARIA chat widget and mission creation UX
- internal route proxying for ARIA so the Gemini API key is never exposed to the browser

Notable frontend areas:

- `frontend/app/` - pages and route handlers
- `frontend/components/` - UI building blocks and dashboard modules
- `frontend/components/aria/` - ARIA chat panel, message rendering, widget shell
- `frontend/lib/api.ts` - Axios client for backend calls
- `frontend/lib/aria-engine.ts` - browser-side ARIA helper calling internal `/api/aria`
- `frontend/app/api/aria/route.ts` - server-side Gemini proxy route
- `frontend/store/` - Zustand state

## ARIA Assistant

ARIA is a mission-focused assistant integrated into the frontend.

What ARIA can do:

- answer questions related to space operations, ISRO, orbital mechanics, and Chronos-1
- generate structured mission creation payloads from natural language
- hand off successful mission payloads into the existing mission creation flow

Security model:

- the browser calls `POST /api/aria` on the Next.js app
- the Next.js route makes the outbound Gemini request on the server
- `GEMINI_API_KEY` stays server-side and should never use a `NEXT_PUBLIC_` prefix

## Mission Lifecycle

Chronos-1 implements a role-aware mission flow:

1. A planner creates a mission in `draft`
2. The planner updates mission parameters and can run simulation
3. The planner submits the mission for review
4. An officer approves or rejects the mission
5. Approved or rejected missions are included in analytics and reporting

Role behavior:

- `planner` can create, update, submit, and inspect owned missions
- `officer` can review all missions and approve/reject pending ones
- `individual` can create missions but does not participate in approval flow

## Weather Scrub Intelligence

Chronos-1 includes a weather scrub risk pipeline supported by assets in `ml/`.

Current model workflow:

- `ml/step1_generate_data.py` generates labeled weather data
- `ml/step2_train_model.py` trains the scrub model
- `ml/step3_predict.py` performs inference workflows

Backend startup behavior:

- if the scrub model artifact does not exist, the backend attempts to generate/train it
- the model is then loaded for API use

The platform combines:

- statistical prediction from the trained model
- deterministic launch-rule style constraints
- site-aware reasoning for supported launch locations

## Simulation, Physics, and Reporting

The system includes several mission-enrichment capabilities:

- Lambert-style trajectory solving
- propagated transfer path generation
- safety and corridor calculations
- launch-related optimization helpers
- mission PDF export with formatted report sections

Mission endpoints can persist trajectory and delta-v data so mission records remain useful after simulation.

## Analytics

Planner analytics include:

- total missions
- counts by status, target, and vehicle
- average delta-v
- average scrub risk
- average approval time
- delta-v over time

Officer analytics include:

- system-wide totals
- approval and rejection counts
- pending review counts
- approval rate
- planner performance summaries
- success breakdowns by vehicle and target
- monthly mission volume

## Tech Stack

Frontend:

- Next.js `16.1.6`
- React `19.2.3`
- TypeScript
- Tailwind CSS
- Framer Motion
- Three.js / React Three Fiber
- Zustand
- Axios

Backend:

- FastAPI `0.115.5`
- SQLAlchemy `2.0.36`
- Alembic
- Pydantic Settings
- python-jose
- bcrypt
- SlowAPI
- ReportLab

ML and scientific tooling:

- scikit-learn `1.6.0`
- pandas `2.2.3`
- numpy `2.2.0`
- scipy `1.14.1`
- joblib

## Local Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- Python 3.10+
- PostgreSQL if you want to use the default backend database URL

## Backend Setup

```bash
cd backend
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create `backend/.env`:

```env
APP_ENV=development
DEBUG=True
DATABASE_URL=postgresql://postgres:password@localhost:5432/chronos1
SECRET_KEY=change-me-to-a-256-bit-random-hex-string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=7
FRONTEND_URL=http://localhost:3000
NASA_JPL_API_KEY=
OPENWEATHER_API_KEY=
```

Run the API:

```bash
uvicorn main:app --reload --port 8000
```

Useful backend URLs:

- `http://localhost:8000/health`
- `http://localhost:8000/docs`
- `http://localhost:8000/redoc`

## Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
GEMINI_API_KEY=your_server_side_gemini_key
```

Run the frontend:

```bash
npm run dev
```

Frontend URL:

- `http://localhost:3000`

## Demo Data

Seed demo users and missions:

```bash
cd backend
python seed_demo_data.py
```

Demo credentials currently seeded by the repo:

- Officer: `admin@chronos.dev` / `Admin123`
- Planner: `planner@chronos.dev` / `Planner123`
- Planner 2: `planner2@chronos.dev` / `Planner234`
- Individual: `individual@chronos.dev` / `Individual123`

## Running Tests

Backend tests:

```bash
cd backend
pytest
```

Frontend lint:

```bash
cd frontend
npm run lint
```

Frontend type-check:

```bash
cd frontend
npx tsc --noEmit
```

## Main API Surface

Authentication:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/change-password`

Missions:

- `POST /api/missions/`
- `GET /api/missions/`
- `GET /api/missions/{mission_id}`
- `PUT /api/missions/{mission_id}`
- `DELETE /api/missions/{mission_id}`
- `POST /api/missions/{mission_id}/submit`
- `POST /api/missions/{mission_id}/approve`
- `POST /api/missions/{mission_id}/reject`
- `POST /api/missions/{mission_id}/simulate`
- `GET /api/missions/{mission_id}/export-pdf`

Analytics:

- `GET /api/analytics/planner`
- `GET /api/analytics/officer`

Scrub and weather:

- `POST /api/v1/scrub/predict`
- weather endpoints under `/api/v1`

## Example Scrub Prediction Request

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

## Repository Notes

- `frontend/.env.local` should never expose Gemini with a `NEXT_PUBLIC_` variable
- if a Gemini key was ever exposed in browser DevTools, rotate it
- the backend currently defaults to PostgreSQL via `DATABASE_URL`
- backend startup may auto-build the scrub model if the artifact is missing
- there are separate `README.md` files in some subfolders for narrower scope docs

## Troubleshooting

If the frontend cannot reach the backend:

- confirm `NEXT_PUBLIC_API_URL` matches your FastAPI host and port
- confirm `FRONTEND_URL` in `backend/.env` matches your Next.js origin
- check CORS behavior from `backend/main.py`

If ARIA is not working:

- confirm `GEMINI_API_KEY` exists in `frontend/.env.local`
- restart the Next.js dev server after changing env values
- verify the browser calls `/api/aria`, not Google directly

If the backend fails at startup:

- confirm the database is reachable
- confirm Python dependencies installed correctly
- inspect whether model generation/training failed during startup

## Contributing

Typical workflow:

```bash
git checkout -b feature/your-change
git commit -m "feat: describe your change"
git push origin feature/your-change
```

Suggested commit prefixes:

- `feat`
- `fix`
- `docs`
- `refactor`
- `test`
- `ui`
- `ml`

## License

No formal open-source license is currently published in this repository. Treat the project as all-rights-reserved unless a license file is added later.
