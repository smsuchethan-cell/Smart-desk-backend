"""
Smart Desk 2.0 — School mode face attendance (runs on the Raspberry Pi, not on Render)

Setup on the Pi (Raspberry Pi OS, Bookworm):
  1. Enable the camera: `sudo raspi-config` -> Interface Options -> Camera -> Enable, then reboot.
  2. pip install -r requirements.txt   (needs opencv-contrib-python for the LBPH recognizer,
     plus picamera2 — see pi_footfall_counter/ for the same camera setup, already proven
     working on real hardware this way)
  3. Set BACKEND_URL below to your deployed backend.
  4. Run: python face_attendance.py   (or SHOW_PREVIEW=0 python face_attendance.py headless)

What it does:
  - Downloads the student list + reference photos from the backend on startup
  - Trains an OpenCV LBPH face recognizer locally from those photos
  - Continuously reads the camera, detects faces, and matches them against known students
  - POSTs an attendance record to the backend on a confident match (backend dedupes per day)
  - Re-syncs the student list every RESYNC_INTERVAL_SECONDS so newly registered students
    get picked up without restarting the script

This was rewritten to match pi_footfall_counter/people_counter_picamera2.py — the sibling
script that WAS run against real hardware and tuned this session — after this one's original
cv2.VideoCapture(0) approach turned out to be exactly the camera-access problem that
script hit before it was switched to picamera2. It also now prints every detected face's
confidence to the console, same as the footfall counter, because that's what made tuning
that script's threshold possible: watch the real numbers first, then adjust
CONFIDENCE_THRESHOLD below to match what you actually see, rather than guessing.

Still: this exact script has not itself been run against real School-mode hardware. Treat
CONFIDENCE_THRESHOLD as a starting point, not a finished, calibrated value — same as the
footfall counter was before it was tuned against real logged numbers.
"""
import os
import time
from typing import Optional

import cv2
import numpy as np
import requests
from picamera2 import Picamera2

# ── Config ────────────────────────────────────────────────────────────────────
BACKEND_URL = "https://smart-desk-backend-11.onrender.com/api/v1"

# LBPH confidence is a distance score — LOWER means a better match. WATCH THE
# CONSOLE: every detected face now prints its actual confidence number. If a
# known student's number is consistently above this threshold (so they never
# get marked present), RAISE it to just above what you're seeing. If two
# different students' numbers are both below it (so one gets marked as the
# other), LOWER it.
CONFIDENCE_THRESHOLD = 80

# Don't re-POST the same student every single frame while they're standing in view.
RECOGNITION_COOLDOWN_SECONDS = 30

# Re-download the student list + retrain periodically, so newly registered students
# get recognized without restarting the script.
RESYNC_INTERVAL_SECONDS = 5 * 60

# Once a face is confidently matched, periodically add it as another training
# sample for that same student (different angle/lighting than their one static
# reference photo) so matching gets more robust as the day goes on — same fix
# that stopped the footfall counter from losing track of people after a brief
# occlusion.
ENRICH_INTERVAL_SECONDS = 60

# Set SHOW_PREVIEW=0 in the environment (as a systemd service would) to run
# headless with no display. Defaults to on for interactive/manual runs.
SHOW_PREVIEW = os.environ.get("SHOW_PREVIEW", "1") != "0"

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
    Returns (recognizer, faces, labels, {label_id: student_dict}) — the raw
    faces/labels lists are kept around so enrich_face() can retrain in place
    later without re-downloading everything."""
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

    return recognizer, faces, labels, students_by_label


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
    recognizer, known_faces, known_labels, students_by_label = build_recognizer(face_cascade)
    last_sync = time.time()
    last_seen = {}     # student_id -> last time we marked them (for the cooldown)
    last_enrich = {}   # student_id -> last time we added a fresh training sample

    picam2 = Picamera2()
    picam2.configure(
        picam2.create_preview_configuration(
            main={"format": "XRGB8888", "size": (640, 480)}
        )
    )
    picam2.start()
    time.sleep(2)

    print("✅ Camera started — School Face Attendance running")

    try:
        while True:
            if time.time() - last_sync > RESYNC_INTERVAL_SECONDS:
                print("Re-syncing student list...")
                recognizer, known_faces, known_labels, students_by_label = build_recognizer(face_cascade)
                last_sync = time.time()

            frame = picam2.capture_array()
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)

            for (x, y, w, h) in faces:
                face = cv2.resize(gray[y:y + h, x:x + w], FACE_SIZE)

                if not known_labels:
                    box_color, caption = (0, 0, 200), "Unknown (no students trained yet)"
                else:
                    label, confidence = recognizer.predict(face)
                    student = students_by_label.get(label)
                    is_match = student is not None and confidence <= CONFIDENCE_THRESHOLD

                    if is_match:
                        name = student["name"]
                        print(f"   (matched {name} — confidence {confidence:.1f}, threshold {CONFIDENCE_THRESHOLD})")
                        now = time.time()
                        if now - last_seen.get(label, 0) > RECOGNITION_COOLDOWN_SECONDS:
                            mark_attendance(student["roll_number"], confidence)
                            last_seen[label] = now
                        if now - last_enrich.get(label, 0) > ENRICH_INTERVAL_SECONDS:
                            known_faces.append(face)
                            known_labels.append(label)
                            recognizer.train(known_faces, np.array(known_labels))
                            last_enrich[label] = now
                        box_color, caption = (0, 200, 0), f"{name} ({confidence:.0f})"
                    else:
                        print(f"   (no match — confidence {confidence:.1f}, threshold {CONFIDENCE_THRESHOLD})")
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
        if SHOW_PREVIEW:
            cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
