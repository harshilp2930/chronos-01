import os
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import JSONResponse
from starlette.status import HTTP_502_BAD_GATEWAY
import httpx
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(tags=["Weather"])

SITE_COORDS = {
    "sdsc": {"lat": 13.7, "lon": 80.2},
    "vssc": {"lat": 8.5, "lon": 76.9},
    "aki": {"lat": 15.1, "lon": 82.9},
}

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
TOMORROW_API_KEY = os.getenv("TOMORROW_API_KEY")

async def fetch_openweather(site_id: str):
    coords = SITE_COORDS[site_id]
    url = (
        f"https://api.openweathermap.org/data/2.5/weather?lat={coords['lat']}&lon={coords['lon']}&appid={OPENWEATHER_API_KEY}&units=metric"
    )
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.json()

async def fetch_tomorrow_lightning(site_id: str):
    coords = SITE_COORDS[site_id]
    url = (
        f"https://api.tomorrow.io/v4/weather/alerts?location={coords['lat']},{coords['lon']}&apikey={TOMORROW_API_KEY}"
    )
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.json()

def map_openweather_to_model_params(ow: dict) -> dict:
    # Some fields may be missing, use .get with defaults
    wind = ow.get("wind", {})
    main = ow.get("main", {})
    clouds = ow.get("clouds", {})
    weather = ow.get("weather", [{}])[0]
    visibility = ow.get("visibility", 10000)  # meters
    rain = ow.get("rain", {})
    # OpenWeatherMap does not provide cloud ceiling, so default to 99999
    return {
        "wind_speed_kmh": wind.get("speed", 0.0) * 3.6,  # m/s to km/h
        "wind_gust_kmh": wind.get("gust", 0.0) * 3.6 if "gust" in wind else wind.get("speed", 0.0) * 3.6,
        "visibility_km": visibility / 1000.0,
        "cloud_ceiling_ft": 99999,  # Not available, set high default
        "temperature_c": main.get("temp", 0.0),
        "precipitation_mm_h": rain.get("1h", 0.0),
        "humidity_pct": main.get("humidity", 0.0),
    }

@router.get("/weather/live")
async def get_live_weather(site_id: str = Query(..., regex="^(sdsc|vssc|aki)$")):
    if site_id not in SITE_COORDS:
        raise HTTPException(status_code=400, detail="Invalid site_id")
    try:
        ow = await fetch_openweather(site_id)
        params = map_openweather_to_model_params(ow)
    except Exception as e:
        return JSONResponse(status_code=HTTP_502_BAD_GATEWAY, content={"error": f"OpenWeatherMap error: {str(e)}"})
    # Lightning distance
    try:
        tmr = await fetch_tomorrow_lightning(site_id)
        lightning_distance = 99.0
        alerts = tmr.get("alerts", [])
        for alert in alerts:
            if "lightning" in alert.get("event", "").lower() or "thunder" in alert.get("event", "").lower():
                # If a storm is detected, set to 5.0 km (example)
                lightning_distance = 5.0
                break
    except Exception:
        lightning_distance = 99.0
    params["lightning_distance_km"] = lightning_distance
    params["site_id"] = site_id
    return params
