"""
Safety Zone Calculator — Indian launch sites.

Computes dynamic exclusion zones around SDSC, VSSC, and AKI launch pads,
applies wind-vector asymmetry, and generates the trajectory corridor as a
series of geodesic waypoints using geopy.

Zone classification (four rings):
  restricted  — absolute no-entry (nominal + 3-σ dispersion)
  warning     — maritime/aviation keep-out
  caution     — advisory for vessels
  advisory    — wide situational-awareness ring
"""

from __future__ import annotations

import math
from typing import List, Optional

import numpy as np

try:
    from geopy.distance import geodesic
    from geopy.point import Point
    _GEOPY = True
except ImportError:
    _GEOPY = False


# ── Launch pad database ───────────────────────────────────────────────────────

PADS: dict[str, dict] = {
    "sdsc": {
        "id": "sdsc",
        "name": "Satish Dhawan Space Centre",
        "location": "Sriharikota, Andhra Pradesh",
        "lat": 13.7199,
        "lon": 80.2304,
        "base_radii_km": {"restricted": 15, "warning": 40, "caution": 75, "advisory": 120},
    },
    "vssc": {
        "id": "vssc",
        "name": "Vikram Sarabhai Space Centre",
        "location": "Thiruvananthapuram, Kerala",
        "lat": 8.5241,
        "lon": 76.9366,
        "base_radii_km": {"restricted": 12, "warning": 35, "caution": 65, "advisory": 100},
    },
    "aki": {
        "id": "aki",
        "name": "Abdul Kalam Island",
        "location": "Odisha Coast",
        "lat": 20.7563,
        "lon": 86.8982,
        "base_radii_km": {"restricted": 10, "warning": 30, "caution": 60, "advisory": 90},
    },
}

# Vehicle class scaling factors (heavier = larger zones)
_VEHICLE_SCALE = {"light": 0.80, "medium": 1.00, "heavy": 1.35, "superheavy": 1.65}

# Zone boundary tolerance (km) for point classification
_TOLERANCE_KM = 0.5

# Number of waypoints for trajectory corridor
_CORRIDOR_WAYPOINTS = 72


# ── Internal helpers ──────────────────────────────────────────────────────────

def _wind_scale(wind_kmh: float) -> float:
    """Scale factor for downwind zone extension (max 1.40 at 60 km/h)."""
    return 1.0 + min(wind_kmh / 150.0, 0.40)


def _wind_direction_offset(wind_dir_deg: float, bearing_deg: float) -> float:
    """
    Fraction of wind extension in a given bearing direction.
    Returns 0–1 (cosine of angular difference, clipped to positive).
    """
    diff = math.radians(bearing_deg - wind_dir_deg)
    return max(0.0, math.cos(diff))


def _bearing_to(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Initial bearing (degrees, 0–360) from point 1 to point 2."""
    la1, lo1, la2, lo2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlo = lo2 - lo1
    x = math.sin(dlo) * math.cos(la2)
    y = math.cos(la1) * math.sin(la2) - math.sin(la1) * math.cos(la2) * math.cos(dlo)
    return (math.degrees(math.atan2(x, y)) + 360) % 360


def _point_at_distance(
    lat: float, lon: float, bearing_deg: float, distance_km: float
) -> tuple[float, float]:
    """
    Destination point given a start, bearing and distance (geodesic).
    Returns (lat, lon).
    """
    if _GEOPY:
        start = (lat, lon)
        dest = geodesic(kilometers=distance_km).destination(start, bearing_deg)
        return dest.latitude, dest.longitude
    # Fallback: flat-earth approximation (accurate for < 500 km)
    R = 6371.0
    d = distance_km / R
    lat_r = math.radians(lat)
    lon_r = math.radians(lon)
    b = math.radians(bearing_deg)
    lat2 = math.asin(
        math.sin(lat_r) * math.cos(d)
        + math.cos(lat_r) * math.sin(d) * math.cos(b)
    )
    lon2 = lon_r + math.atan2(
        math.sin(b) * math.sin(d) * math.cos(lat_r),
        math.cos(d) - math.sin(lat_r) * math.sin(lat2),
    )
    return math.degrees(lat2), math.degrees(lon2)


# ── Zone polygon generator ────────────────────────────────────────────────────

def _zone_polygon(
    pad_lat: float,
    pad_lon: float,
    base_radius_km: float,
    wind_kmh: float,
    wind_dir_deg: float,
    n_points: int = 36,
) -> list[dict]:
    """
    Generate an asymmetric polygon for a zone ring.
    Downwind side is extended by _wind_scale(); upwind compressed slightly.
    """
    ws = _wind_scale(wind_kmh)
    polygon = []
    for i in range(n_points):
        bearing = i * 360.0 / n_points
        wind_factor = _wind_direction_offset(wind_dir_deg, bearing)
        # Radius ranges from base_radius_km to base_radius_km * ws downwind
        radius = base_radius_km * (1.0 + wind_factor * (ws - 1.0))
        lat, lon = _point_at_distance(pad_lat, pad_lon, bearing, radius)
        polygon.append({"lat": lat, "lon": lon, "bearing_deg": round(bearing, 1)})
    # Close the polygon
    polygon.append(polygon[0])
    return polygon


# ── Trajectory corridor ───────────────────────────────────────────────────────

def compute_corridor(
    pad_id: str,
    azimuth_deg: float,
    nominal_range_km: float = 500.0,
    half_width_km: float = 20.0,
    n_points: int = _CORRIDOR_WAYPOINTS,
) -> dict:
    """
    Compute the trajectory corridor ground track as left/right boundary
    polylines along the launch azimuth.

    Parameters
    ----------
    pad_id           : 'sdsc' | 'vssc' | 'aki'
    azimuth_deg      : launch azimuth (0 = North, 90 = East)
    nominal_range_km : downrange extent of corridor
    half_width_km    : half-width of the corridor (lateral buffer)
    n_points         : number of waypoints along the centerline

    Returns
    -------
    dict with centerline, left_boundary, right_boundary as lat/lon lists.
    """
    pad = PADS.get(pad_id.lower())
    if pad is None:
        raise ValueError(f"Unknown pad: {pad_id}")

    pad_lat, pad_lon = pad["lat"], pad["lon"]
    step_km = nominal_range_km / max(n_points - 1, 1)

    left_az  = (azimuth_deg - 90.0) % 360.0
    right_az = (azimuth_deg + 90.0) % 360.0

    centerline, left_boundary, right_boundary = [], [], []

    for i in range(n_points):
        dist = i * step_km
        c_lat, c_lon = _point_at_distance(pad_lat, pad_lon, azimuth_deg, dist)
        l_lat, l_lon = _point_at_distance(c_lat, c_lon, left_az, half_width_km)
        r_lat, r_lon = _point_at_distance(c_lat, c_lon, right_az, half_width_km)

        centerline.append({"lat": round(c_lat, 6), "lon": round(c_lon, 6), "range_km": round(dist, 2)})
        left_boundary.append({"lat": round(l_lat, 6), "lon": round(l_lon, 6)})
        right_boundary.append({"lat": round(r_lat, 6), "lon": round(r_lon, 6)})

    return {
        "pad_id": pad_id,
        "azimuth_deg": azimuth_deg,
        "nominal_range_km": nominal_range_km,
        "half_width_km": half_width_km,
        "centerline": centerline,
        "left_boundary": left_boundary,
        "right_boundary": right_boundary,
    }


# ── Public: calculate zones ───────────────────────────────────────────────────

def calculate_safety_zones(
    pad_id: str,
    vehicle_class: str = "medium",
    wind_speed_kmh: float = 0.0,
    wind_direction_deg: float = 0.0,
    launch_azimuth_deg: Optional[float] = None,
) -> dict:
    """
    Compute all four safety zone polygons for a given pad and vehicle class.

    Parameters
    ----------
    pad_id             : 'sdsc' | 'vssc' | 'aki'
    vehicle_class      : 'light' | 'medium' | 'heavy' | 'superheavy'
    wind_speed_kmh     : surface wind speed in km/h
    wind_direction_deg : wind FROM direction (meteorological, 0=N, 90=E)
    launch_azimuth_deg : optional — if given, corridor is also included

    Returns
    -------
    dict with pad info, zone polygons, and optional trajectory corridor.
    """
    pad = PADS.get(pad_id.lower())
    if pad is None:
        raise ValueError(f"Unknown pad '{pad_id}'. Valid: {list(PADS)}")

    v_scale = _VEHICLE_SCALE.get(vehicle_class.lower(), 1.0)
    pad_lat, pad_lon = pad["lat"], pad["lon"]

    zones: dict[str, dict] = {}
    for zone_name, base_r in pad["base_radii_km"].items():
        scaled_r = base_r * v_scale
        zones[zone_name] = {
            "radius_km": round(scaled_r, 2),
            "polygon": _zone_polygon(
                pad_lat, pad_lon, scaled_r, wind_speed_kmh, wind_direction_deg
            ),
        }

    result: dict = {
        "pad": pad,
        "vehicle_class": vehicle_class,
        "wind_speed_kmh": wind_speed_kmh,
        "wind_direction_deg": wind_direction_deg,
        "zones": zones,
    }

    if launch_azimuth_deg is not None:
        result["corridor"] = compute_corridor(
            pad_id, launch_azimuth_deg,
            nominal_range_km=max(zones["advisory"]["radius_km"] * 1.5, 500.0),
        )

    return result


# ── Public: classify a point ──────────────────────────────────────────────────

def classify_point(
    pad_id: str,
    point_lat: float,
    point_lon: float,
    vehicle_class: str = "medium",
    wind_speed_kmh: float = 0.0,
    wind_direction_deg: float = 0.0,
) -> dict:
    """
    Determine which safety zone (if any) a lat/lon point falls within.

    Returns
    -------
    dict with zone (restricted/warning/caution/advisory/clear),
    distance_km from pad, bearing_deg.
    """
    pad = PADS.get(pad_id.lower())
    if pad is None:
        raise ValueError(f"Unknown pad: {pad_id}")

    pad_lat, pad_lon = pad["lat"], pad["lon"]

    if _GEOPY:
        dist_km = geodesic((pad_lat, pad_lon), (point_lat, point_lon)).km
    else:
        # Haversine fallback
        R = 6371.0
        la1, lo1, la2, lo2 = map(math.radians, [pad_lat, pad_lon, point_lat, point_lon])
        dla = la2 - la1; dlo = lo2 - lo1
        a = math.sin(dla / 2)**2 + math.cos(la1) * math.cos(la2) * math.sin(dlo / 2)**2
        dist_km = R * 2 * math.asin(math.sqrt(a))

    bearing = _bearing_to(pad_lat, pad_lon, point_lat, point_lon)
    v_scale = _VEHICLE_SCALE.get(vehicle_class.lower(), 1.0)
    ws      = _wind_scale(wind_speed_kmh)

    zone_label = "clear"
    for zone_name in ["restricted", "warning", "caution", "advisory"]:
        base_r = pad["base_radii_km"][zone_name]
        wind_factor = _wind_direction_offset(wind_direction_deg, bearing)
        effective_r = base_r * v_scale * (1.0 + wind_factor * (ws - 1.0))
        if dist_km <= effective_r + _TOLERANCE_KM:
            zone_label = zone_name
            break

    return {
        "pad_id": pad_id,
        "point": {"lat": point_lat, "lon": point_lon},
        "zone": zone_label,
        "distance_km": round(dist_km, 3),
        "bearing_deg": round(bearing, 1),
        "is_restricted": zone_label == "restricted",
        "is_safe": zone_label in ("advisory", "clear"),
    }
