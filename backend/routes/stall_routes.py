from fastapi import APIRouter
from datetime import datetime, date
import json
import os

router = APIRouter()

DATA_FILE = "static/stall_data.json"

def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    return {
        "today_count":     0,
        "yesterday_count": 0,
        "total_count":     0,
        "today_date":      str(date.today()),
        "last_updated":    None
    }

def save_data(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f)

def check_and_reset(data):
    """Reset today's count if date has changed."""
    today = str(date.today())
    if data["today_date"] != today:
        data["yesterday_count"] = data["today_count"]
        data["today_count"]     = 0
        data["today_date"]      = today
        save_data(data)
    return data


@router.post("/stall/update")
def update_stall_count(count: int):
    data = load_data()
    data = check_and_reset(data)

    # Only update if count is higher than current
    # (Pi sends cumulative count, so we just update)
    if count > data["today_count"]:
        diff = count - data["today_count"]
        data["today_count"] = count
        data["total_count"] += diff

    data["last_updated"] = str(datetime.now())
    save_data(data)
    return {"status": "updated", "count": count}


@router.get("/stall/count")
def get_stall_count():
    data = load_data()
    data = check_and_reset(data)
    return data


@router.post("/stall/reset")
def reset_stall_count():
    data = load_data()
    data["yesterday_count"] = data["today_count"]
    data["today_count"]     = 0
    data["today_date"]      = str(date.today())
    data["last_updated"]    = str(datetime.now())
    save_data(data)
    return {"status": "reset"}
# ============================================================
# GPS LOCATION APIs (NEW)
# ============================================================

@router.post("/stall/gps")
def update_gps(latitude: float, longitude: float):
    data = load_data()

    data["latitude"] = latitude
    data["longitude"] = longitude
    data["last_updated"] = str(datetime.now())

    save_data(data)

    return {
        "status": "GPS Updated",
        "latitude": latitude,
        "longitude": longitude
    }


@router.get("/stall/gps")
def get_gps():
    data = load_data()

    return {
        "latitude": data.get("latitude"),
        "longitude": data.get("longitude")
    }