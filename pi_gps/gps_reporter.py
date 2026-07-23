"""
Smart Desk 2.0 — GPS reporter (runs on the Raspberry Pi, not on Render)

Reads NMEA sentences from a GPS module wired to the Pi's GPIO UART pins
(e.g. NEO-6M/NEO-7M) and posts the fix to POST /stall/gps, so the admin
dashboard can show the desk's real location instead of "not showing".

Setup on the Pi:
  1. Enable the hardware UART and free it from the serial console:
       sudo raspi-config -> Interface Options -> Serial Port
         - "Would you like a login shell over serial?" -> No
         - "Would you like the serial port hardware enabled?" -> Yes
     Then reboot.
  2. Wire the module: GPS VCC -> Pi 5V (or 3.3V, check your module),
     GPS GND -> Pi GND, GPS TX -> Pi RX (GPIO15), GPS RX -> Pi TX (GPIO14).
  3. pip install -r requirements.txt   (pyserial + pynmea2)
  4. Set BACKEND_URL below if it ever changes.
  5. Run: python gps_reporter.py

GPS modules need a clear view of open sky to get a satellite fix — if this
desk is indoors, the module may print "waiting for fix" indefinitely. Test
outdoors (or near a window) first to confirm the module itself works before
assuming the code is wrong. A cold start can take 30-60+ seconds even
outdoors; that's normal GPS behavior, not a bug.
"""
import time

import serial
import pynmea2
import requests

BACKEND_URL = "https://smart-desk-backend-11.onrender.com/api/v1"

SERIAL_PORT = "/dev/serial0"
BAUD_RATE = 9600

# How often to POST a fix to the backend, once we have one.
REPORT_INTERVAL_SECONDS = 60


def send_gps(latitude: float, longitude: float):
    try:
        requests.post(
            f"{BACKEND_URL}/stall/gps",
            params={"latitude": latitude, "longitude": longitude},
            timeout=10,
        )
        print(f"→ Sent GPS fix: {latitude:.6f}, {longitude:.6f}")
    except Exception as e:
        print(f"⚠ Failed to send GPS fix: {e}")


def main():
    ser = serial.Serial(SERIAL_PORT, baudrate=BAUD_RATE, timeout=1)
    print(f"Listening on {SERIAL_PORT} @ {BAUD_RATE} baud. Waiting for a GPS fix...")

    last_report = 0.0
    have_fix = False

    try:
        while True:
            try:
                line = ser.readline().decode("ascii", errors="replace").strip()
            except Exception as e:
                print(f"⚠ Serial read error: {e}")
                time.sleep(1)
                continue

            if not line.startswith("$GPRMC") and not line.startswith("$GNRMC"):
                continue

            try:
                msg = pynmea2.parse(line)
            except pynmea2.ParseError:
                continue

            # RMC's status field is 'A' (active/valid fix) or 'V' (void — no fix yet).
            if getattr(msg, "status", "V") != "A":
                if not have_fix:
                    print("… waiting for satellite fix (no clear sky view yet?)")
                time.sleep(2)
                continue

            if not have_fix:
                print("✓ GPS fix acquired.")
                have_fix = True

            now = time.time()
            if now - last_report >= REPORT_INTERVAL_SECONDS:
                send_gps(msg.latitude, msg.longitude)
                last_report = now

    except KeyboardInterrupt:
        pass
    finally:
        ser.close()


if __name__ == "__main__":
    main()
