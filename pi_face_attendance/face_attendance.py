"""
Smart Desk 2.0 — School mode face attendance (runs on the Raspberry Pi, not on Render)

Setup on the Pi (Raspberry Pi OS):
  1. Enable the camera: `sudo raspi-config` -> Interface Options -> Camera -> Enable, then reboot.
     On older Pi OS (legacy camera stack) this exposes /dev/video0 directly, which is what
     cv2.VideoCapture(0) below expects. On newer Bookworm-based Pi OS (libcamera-only), you may
     instead need `sudo modprobe bcm2835-v4l2` (or install v4l2loopback) to get /dev/video0, or
     switch this script to the `picamera2` library and convert its frames to numpy arrays for cv2.
  2. pip install -r requirements.txt   (needs opencv-contrib-python, not plain opencv-python —
     the LBPH recognizer lives in the "contrib" module)
  3. Set BACKEND_URL below to your deployed backend.
  4. Run: python face_attendance.py

What it does:
  - Downloads the student list + reference photos from the backend on startup
  - Trains an OpenCV LBPH face recognizer locally from those photos
  - Continuously reads the camera, detects faces, and matches them against known students
  - POSTs an attendance record to the backend on a confident match (backend dedupes per day)
  - Re-syncs the student list every RESYNC_INTERVAL_SECONDS so newly registered students
    get picked up without restarting the script

This has not been run against real Pi hardware — the author didn't have a device available
when writing it. Treat it as a solid starting point to debug against your actual camera/lighting,
not as a finished, tuned product.
"""
import time
from typing import Optional

import cv2
import numpy as np
import requests

# ── Config ────────────────────────────────────────────────────────────────────
BACKEND_URL = "https://smart-desk-backend-11.onrender.com/api/v1"

# LBPH confidence is a distance score — LOWER means a better match. Tune this against
# your own camera/lighting; start around 70-90 and tighten it if you get false positives.
CONFIDENCE_THRESHOLD = 80

# Don't re-POST the same student every single frame while they're standing in view.
RECOGNITION_COOLDOWN_SECONDS = 30

# Re-download the student list + retrain periodically, so newly registered students
# get recognized without restarting the script.
RESYNC_INTERVAL_SECONDS = 5 * 60

# Set False on a headless Pi (no monitor attached) to skip the preview window.
SHOW_PREVIEW = True

FACE_SIZE = (200, 200)
CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"


def fetch_students():
    resp = requests.get(f"{BACKEND_URL}/students", timeout=15)
    resp.raise_for_status()
    return resp.json()


def download_face(photo_url: str, face_cascade) -> Optional[np.ndarray]:
    """Downloads a student's reference photo and crops out the first detected face."""
    try:
        resp = requests.get(photo_url, timeout=15)
        resp.raise_for_status()
        arr = np.frombuffer(resp.content, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return None
        faces = face_cascade.detectMultiScale(img, scaleFactor=1.1, minNeighbors=5)
        if len(faces) == 0:
            return None
        x, y, w, h = faces[0]
        face = img[y:y + h, x:x + w]
        return cv2.resize(face, FACE_SIZE)
    except Exception as e:
        print(f"⚠ Couldn't process reference photo {photo_url}: {e}")
        return None


def build_recognizer(face_cascade):
    """Downloads all students + reference photos and trains an LBPH recognizer.
    Returns (recognizer, {label_id: student_dict}) — label_id is the student's DB id."""
    students = fetch_students()

    faces, labels, students_by_label = [], [], {}
    for s in students:
        if not s.get("photo_path"):
            print(f"⚠ Skipping {s['name']} — no reference photo")
            continue
        photo_url = f"{BACKEND_URL.rsplit('/api/v1', 1)[0]}/{s['photo_path']}"
        face = download_face(photo_url, face_cascade)
        if face is None:
            print(f"⚠ Skipping {s['name']} — no face detected in reference photo")
            continue
        faces.append(face)
        labels.append(s["id"])
        students_by_label[s["id"]] = s

    recognizer = cv2.face.LBPHFaceRecognizer_create()
    if faces:
        recognizer.train(faces, np.array(labels))
        print(f"✅ Trained on {len(faces)} student(s)")
    else:
        print("⚠ No usable reference photos yet — recognizer is untrained")

    return recognizer, students_by_label


def mark_attendance(roll_number: str, confidence: float):
    try:
        resp = requests.post(
            f"{BACKEND_URL}/school/attendance",
            data={"roll_number": roll_number, "confidence": confidence},
            timeout=15,
        )
        resp.raise_for_status()
        print(f"→ {resp.json().get('message')}")
    except Exception as e:
        print(f"⚠ Failed to mark attendance for {roll_number}: {e}")


def main():
    face_cascade = cv2.CascadeClassifier(CASCADE_PATH)
    recognizer, students_by_label = build_recognizer(face_cascade)
    last_sync = time.time()
    last_seen = {}  # student_id -> last time we marked them (for the cooldown)

    cam = cv2.VideoCapture(0)
    if not cam.isOpened():
        raise RuntimeError(
            "Could not open camera (/dev/video0). Check that the Pi Camera is enabled "
            "and, on Bookworm-based Pi OS, that the v4l2 compatibility layer is loaded."
        )

    print("Camera opened. Press 'q' in the preview window to quit (if SHOW_PREVIEW is on).")

    try:
        while True:
            ok, frame = cam.read()
            if not ok:
                print("⚠ Failed to read a frame, retrying...")
                time.sleep(1)
                continue

            if time.time() - last_sync > RESYNC_INTERVAL_SECONDS:
                print("Re-syncing student list...")
                recognizer, students_by_label = build_recognizer(face_cascade)
                last_sync = time.time()

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)

            for (x, y, w, h) in faces:
                face = cv2.resize(gray[y:y + h, x:x + w], FACE_SIZE)
                label, confidence = recognizer.predict(face)
                student = students_by_label.get(label)

                if student and confidence <= CONFIDENCE_THRESHOLD:
                    name = student["name"]
                    now = time.time()
                    if now - last_seen.get(label, 0) > RECOGNITION_COOLDOWN_SECONDS:
                        mark_attendance(student["roll_number"], confidence)
                        last_seen[label] = now
                    box_color, caption = (0, 200, 0), f"{name} ({confidence:.0f})"
                else:
                    box_color, caption = (0, 0, 200), "Unknown"

                if SHOW_PREVIEW:
                    cv2.rectangle(frame, (x, y), (x + w, y + h), box_color, 2)
                    cv2.putText(frame, caption, (x, y - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, box_color, 2)

            if SHOW_PREVIEW:
                cv2.imshow("Smart Desk — Face Attendance", frame)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break

    except KeyboardInterrupt:
        pass
    finally:
        cam.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
