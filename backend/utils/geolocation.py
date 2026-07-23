"""Best-effort, passive IP geolocation — city/region/country only, not exact
GPS, and not always accurate (mobile carrier NAT and VPNs commonly report
the wrong city). Uses ip-api.com's free tier (no API key, ~45 req/min limit,
HTTP only on the free plan). Good enough for "which city are our scans
coming from" dashboard context, not a precision tracking tool.
"""
import requests

_EMPTY = {"city": None, "region": None, "country": None}


def get_ip_location(ip: str) -> dict:
    if not ip or ip in ("unknown", "127.0.0.1", "::1", "testclient"):
        return dict(_EMPTY)
    try:
        resp = requests.get(
            f"http://ip-api.com/json/{ip}",
            params={"fields": "status,city,regionName,country"},
            timeout=5,
        )
        data = resp.json()
        if data.get("status") != "success":
            return dict(_EMPTY)
        return {
            "city":    data.get("city"),
            "region":  data.get("regionName"),
            "country": data.get("country"),
        }
    except Exception as e:
        print(f"IP geolocation failed for {ip}: {e}")
        return dict(_EMPTY)
