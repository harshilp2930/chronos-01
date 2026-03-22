# Chronos-1: Interplanetary Mission & Intelligence Optimizer

**Authors:** Yug Mulani, Harshil Patel  
**Institution:** G H Patel College of Engineering & Technology, CVM University  
**Course:** B.E. Computer Science & Design, Semester VI

---

## Phase 1 — Backend Foundation (Complete)

### What's built

| Layer                                                | Files                                                 |
| ---------------------------------------------------- | ----------------------------------------------------- |
| App entry point                                      | `main.py`                                             |
| Core config                                          | `app/core/config.py`                                  |
| Database (SQLAlchemy + PostgreSQL)                   | `app/core/database.py`                                |
| Security (JWT HS256, bcrypt-12)                      | `app/core/security.py`                                |
| ORM: User model                                      | `app/models/user.py`                                  |
| ORM: Mission model                                   | `app/models/mission.py`                               |
| Pydantic schemas: auth                               | `app/schemas/auth.py`                                 |
| Pydantic schemas: mission                            | `app/schemas/mission.py`                              |
| Pydantic schemas: simulation                         | `app/schemas/simulation.py`                           |
| API: auth (register/login/me/refresh/change-pw)      | `app/api/auth.py`                                     |
| API: missions CRUD + approval flow                   | `app/api/missions.py`                                 |
| API: users management (officer)                      | `app/api/users.py`                                    |
| API: analytics (planner + officer)                   | `app/api/analytics.py`                                |
| API stubs: simulation, safety, weather, optimization | `app/api/{simulation,safety,weather,optimization}.py` |
| DB migrations                                        | `alembic/` + `alembic.ini`                            |
| Tests (auth, missions, users)                        | `tests/`                                              |

---

## Quick Start

### 1. Create & activate virtual environment

```bash
cd chronos-1/backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env and set DATABASE_URL, SECRET_KEY
```

### 4. Create PostgreSQL database

```sql
CREATE DATABASE chronos1;
```

### 5. Run migrations

```bash
alembic upgrade head
```

### 6. Start the API server

```bash
uvicorn main:app --reload --port 8000
```

API docs: http://localhost:8000/docs  
Health: http://localhost:8000/health

---

## Running Tests

Tests use an in-memory SQLite DB — no PostgreSQL required.

```bash
pytest
```

---

## API Reference (Phase 1)

### Authentication `/api/auth/`

| Method | Path                        | Auth | Description                           |
| ------ | --------------------------- | ---- | ------------------------------------- |
| POST   | `/api/auth/register`        | ✗    | Register (officer/planner/individual) |
| POST   | `/api/auth/login`           | ✗    | Login, receive JWT                    |
| GET    | `/api/auth/me`              | ✓    | Get current user                      |
| POST   | `/api/auth/refresh`         | ✗    | Refresh access token                  |
| POST   | `/api/auth/change-password` | ✓    | Change password                       |

### Missions `/api/missions/`

| Method | Path                            | Auth    | Description                 |
| ------ | ------------------------------- | ------- | --------------------------- |
| POST   | `/api/missions/`                | ✓       | Create mission              |
| GET    | `/api/missions/`                | ✓       | List missions               |
| GET    | `/api/missions/{id}`            | ✓       | Get mission                 |
| PUT    | `/api/missions/{id}`            | ✓       | Update mission (draft only) |
| DELETE | `/api/missions/{id}`            | ✓       | Delete mission (draft only) |
| POST   | `/api/missions/{id}/submit`     | planner | Submit for approval         |
| POST   | `/api/missions/{id}/approve`    | officer | Approve mission             |
| POST   | `/api/missions/{id}/reject`     | officer | Reject mission              |
| GET    | `/api/missions/{id}/export-pdf` | ✓       | PDF export (Phase 5 stub)   |

### Users `/api/users/` (officer only except GET own profile)

| Method | Path                         | Auth    | Description            |
| ------ | ---------------------------- | ------- | ---------------------- |
| POST   | `/api/users/`                | officer | Create planner account |
| GET    | `/api/users/`                | officer | List all users         |
| GET    | `/api/users/{id}`            | ✓       | Get user profile       |
| PATCH  | `/api/users/{id}/deactivate` | officer | Deactivate user        |
| PATCH  | `/api/users/{id}/reactivate` | officer | Reactivate user        |

### Analytics `/api/analytics/`

| Method | Path                     | Auth    | Description       |
| ------ | ------------------------ | ------- | ----------------- |
| GET    | `/api/analytics/planner` | ✓       | Own mission stats |
| GET    | `/api/analytics/officer` | officer | System-wide stats |

---

## Roles & Permissions

| Feature             | Officer | Planner | Individual |
| ------------------- | ------- | ------- | ---------- |
| Create missions     | ✓       | ✓       | ✓          |
| Submit for approval | ✓       | ✓       | ✗          |
| Approve / Reject    | ✓       | ✗       | ✗          |
| See all missions    | ✓       | ✗ (own) | ✗ (own)    |
| Manage users        | ✓       | ✗       | ✗          |
| Officer analytics   | ✓       | ✗       | ✗          |

---

## Build Phases

- **Phase 1** ✅ Backend Foundation (this phase)
- **Phase 2** 🔲 Physics Engine + AI/ML (Lambert, RK4, GA, Random Forest)
- **Phase 3** 🔲 Frontend Foundation (Next.js 15, Tailwind, auth pages)
- **Phase 4** 🔲 Planner Dashboard + 3D Solar System
- **Phase 5** 🔲 Officer Dashboard + PDF Export
- **Phase 6** 🔲 Polish, Responsive, E2E Tests
