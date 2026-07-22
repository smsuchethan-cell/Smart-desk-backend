"""
Smart Desk 2.0 — Anonymous footfall counter (runs on the Raspberry Pi, not on Render)

Counts UNIQUE visitors per day using face detection + face matching:
  Person A detected   -> new face  -> count = 1
  Person A comes back -> matched   -> count stays 1
  Person B detected   -> new face  -> count = 2
  Midnight            -> memory cleared -> count = 0 (next day starts fresh)

This is deliberately anonymous — unlike pi_face_attendance/ (which matches
faces against known, named students), this script never identifies anyone.
It only asks "have I seen a face like this today?" so the same person
walking past repeatedly doesn't get counted multiple times.

Setup on the Pi (same as pi_face_attendance/):
  1. Enable the camera: `sudo raspi-config` -> Interface Options -> Camera -> Enable, then reboot.
     On Bookworm-based Pi OS you may need `sudo modprobe bcm2835-v4l2` to get /dev/video0.
  2. pip install -r requirements.txt   (needs opencv-contrib-python, not plain opencv-python)
  3. Set BACKEND_URL below to your deployed backend.
  4. Run: python footfall_counter.py

This has not been run against real Pi hardware — treat MATCH_THRESHOLD as a
starting point to tune against your own camera, lighting, and typical
distance from the lens, not a finished, calibrated value.
"""
import time
from datetime import date

import cv2
import numpy as np
import requests

BACKEND_URL = "https://smart-desk-backend-11.onrender.com/api/v1"

# LBPH confidence is a distance score — LOWER means a better match.
MATCH_THRESHOLD = 70

# How often to tell the backend "I'm alive", independent of whether the
# count changed — this drives the Dashboard's CAMERA STATUS indicator.
HEARTBEAT_INTERVAL_SECONDS = 15

FACE_SIZE = (200, 200)
CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
SHOW_PREVIEW = True


def send_heartbeat():
    try:
        requests.post(f"{BACKEND_URL}/stall/heartbeat", timeout=10)
    except Exception as e:
        print(f"⚠ Heartbeat failed: {e}")


def send_count(count: int):
    try:
        requests.post(f"{BACKEND_URL}/stall/update", params={"count": count}, timeout=10)
        print(f"→ Unique visitors today: {count}")
    except Exception as e:
        print(f"⚠ Failed to send count: {e}")


class DailyFaceCounter:
    """Tracks distinct faces seen today. Call .reset() at midnight."""

    def __init__(self):
        self.reset()

    def reset(self):
        self.recognizer = cv2.face.LBPHFaceRecognizer_create()
        self.faces = []
        self.labels = []
        self.count = 0
        self.trained = False

    def _is_known(self, face) -> bool:
        if not self.trained:
            return False
        _label, confidence = self.recognizer.predict(face)
        return confidence <= MATCH_THRESHOLD

    def see(self, face) -> bool:
        """Registers a detected face. Returns True if it's a NEW person
        (and bumps the count); False if it matched someone already seen today."""
        if self._is_known(face):
            return False

        # New face — add it and retrain. Small daily crowd sizes make a full
        # retrain on every new face cheap and simple, vs. incremental update().
        self.faces.append(face)
        self.labels.append(len(self.labels))
        self.recognizer.train(self.faces, np.array(self.labels))
        self.trained = True
        self.count += 1
        return True


def main():
    face_cascade = cv2.CascadeClassifier(CASCADE_PATH)
    counter = DailyFaceCounter()
    today = date.today()
    last_heartbeat = 0.0

    cam = cv2.VideoCapture(0)
    if not cam.isOpened():
        raise RuntimeError(
            "Could not open camera (/dev/video0). Check that the Pi Camera is enabled "
            "and, on Bookworm-based Pi OS, that the v4l2 compatibility layer is loaded."
        )

    print("Camera opened. Press 'q' in the preview window to quit (if SHOW_PREVIEW is on).")

    try:
        while True:
            # Midnight rollover — clear the day's face memory so returning
            # visitors get counted fresh tomorrow, matching the backend's
            # own today/yesterday reset in stall_routes.py.
            if date.today() != today:
                today = date.today()
                counter.reset()
                print("New day — footfall memory cleared.")

            now = time.time()
            if now - last_heartbeat > HEARTBEAT_INTERVAL_SECONDS:
                send_heartbeat()
                last_heartbeat = now

            ok, frame = cam.read()
            if not ok:
                print("⚠ Failed to read a frame, retrying...")
                time.sleep(1)
                continue

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)

            for (x, y, w, h) in faces:
                face = cv2.resize(gray[y:y + h, x:x + w], FACE_SIZE)
                is_new = counter.see(face)
                if is_new:
                    send_count(counter.count)

                if SHOW_PREVIEW:
                    color = (0, 140, 255) if is_new else (0, 200, 0)
                    cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)

            if SHOW_PREVIEW:
                cv2.putText(frame, f"Today: {counter.count}", (10, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 140, 255), 2)
                cv2.imshow("Smart Desk — Footfall Counter", frame)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break

    except KeyboardInterrupt:
        pass
    finally:
        cam.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
