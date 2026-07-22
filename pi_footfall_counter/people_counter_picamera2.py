from picamera2 import Picamera2
import cv2
import numpy as np
import os
import time
import requests
from datetime import date

API_URL       = "https://smart-desk-backend-11.onrender.com/api/v1/stall/update"
HEARTBEAT_URL = "https://smart-desk-backend-11.onrender.com/api/v1/stall/heartbeat"

# Set SHOW_PREVIEW=0 in the environment (as the systemd service does) to run
# headless with no display — needed since a systemd service has no monitor
# attached. Defaults to on for interactive/manual runs.
SHOW_PREVIEW = os.environ.get("SHOW_PREVIEW", "1") != "0"

# LBPH confidence is a distance score — LOWER means a better match.
# Start here, but WATCH THE TERMINAL: every detected face now prints its
# actual confidence number. If the same person's number is consistently
# above this threshold (so they keep getting re-counted), RAISE it to just
# above what you're seeing. If two different people's numbers are both
# below it (so they get merged into one), LOWER it.
MATCH_THRESHOLD = 110

# Safety net: even with a good threshold, one noisy frame could momentarily
# fail to match someone who was just registered — this stops that single
# bad frame from re-triggering a "new person" a split-second later.
MIN_REGISTRATION_GAP_S = 2

# A face must fail to match for this many CONSECUTIVE frames before it's
# confirmed as a genuinely new person — smooths over single transitional
# frames (e.g. right after your hand uncovers the camera and the image is
# briefly blurry/re-exposing). Note: this is a single shared counter, so if
# two different new people appear in the same frame together, this simple
# version won't track them independently — fine for a typical one-at-a-time
# stall, a known limitation if you regularly get simultaneous new visitors.
CONSECUTIVE_MISMATCH_REQUIRED = 3

# Once a face is recognized, periodically add it as another training sample
# for that same person (different angle/lighting/post-occlusion look) so
# matching gets more robust over time instead of relying on one frozen
# reference photo forever.
ENRICH_INTERVAL_S = 3

FACE_SIZE            = (200, 200)
HEARTBEAT_INTERVAL_S = 15
SEND_INTERVAL_S      = 5

picam2 = Picamera2()
picam2.configure(
    picam2.create_preview_configuration(
        main={"format": "XRGB8888", "size": (640, 480)}
    )
)
picam2.start()
time.sleep(2)

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
recognizer   = cv2.face.LBPHFaceRecognizer_create()
known_faces  = []
known_labels = []
trained      = False
last_enrich  = {}  # label -> last time we added a fresh sample for them

count               = 0
today               = date.today()
last_sent           = 0
last_heartbeat      = 0
last_registration   = 0
pending_mismatches  = 0

print("✅ Smart People Counter Started (face-based unique counting)")


def check_face(face):
    """Returns (is_known, confidence, label). confidence/label are None if untrained."""
    if not trained:
        return False, None, None
    label, confidence = recognizer.predict(face)
    return confidence <= MATCH_THRESHOLD, confidence, label


def register_face(face):
    global trained
    label = len(known_labels)
    known_faces.append(face)
    known_labels.append(label)
    recognizer.train(known_faces, np.array(known_labels))
    trained = True
    return label


def enrich_face(label, face):
    now = time.time()
    if now - last_enrich.get(label, 0) < ENRICH_INTERVAL_S:
        return
    known_faces.append(face)
    known_labels.append(label)
    recognizer.train(known_faces, np.array(known_labels))
    last_enrich[label] = now


while True:
    # Midnight reset — matches the backend's own today/yesterday rollover.
    if date.today() != today:
        today = date.today()
        known_faces.clear()
        known_labels.clear()
        last_enrich.clear()
        trained = False
        count = 0
        print("🌙 New day — memory cleared, count reset to 0")

    frame = picam2.capture_array()
    gray  = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)
    now = time.time()

    for (x, y, w, h) in faces:
        face_img = cv2.resize(gray[y:y + h, x:x + w], FACE_SIZE)
        is_known, confidence, label = check_face(face_img)

        if is_known:
            pending_mismatches = 0
            enrich_face(label, face_img)
            color = (0, 255, 0)  # green = already counted today
            print(f"   (matched existing face — confidence {confidence:.1f}, threshold {MATCH_THRESHOLD})")
        else:
            pending_mismatches += 1
            if pending_mismatches < CONSECUTIVE_MISMATCH_REQUIRED:
                color = (0, 200, 255)  # yellow = unmatched, waiting for confirmation
            elif now - last_registration < MIN_REGISTRATION_GAP_S:
                color = (0, 200, 255)  # yellow = confirmed-new but debounced
            else:
                conf_str = f"{confidence:.1f}" if confidence is not None else "n/a (first face)"
                register_face(face_img)
                last_registration = now
                pending_mismatches = 0
                count += 1
                color = (0, 140, 255)  # orange = just counted as new
                print(f"✔ New person counted! Total: {count} (confidence was {conf_str}, threshold {MATCH_THRESHOLD})")

        cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)

    # Heartbeat — this is what makes "CAMERA STATUS" show LIVE on the Dashboard.
    if now - last_heartbeat > HEARTBEAT_INTERVAL_S:
        try:
            requests.post(HEARTBEAT_URL, timeout=10)
            last_heartbeat = now
        except Exception as e:
            print(f"⚠ Heartbeat error: {e}")

    if now - last_sent > SEND_INTERVAL_S:
        try:
            requests.post(API_URL, params={"count": count}, timeout=10)
            print(f"📡 Sent count: {count}")
            last_sent = now
        except Exception as e:
            print(f"⚠ API error: {e}")

    if SHOW_PREVIEW:
        cv2.putText(frame, f"Count: {count}", (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        cv2.imshow("Smart Counter", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

if SHOW_PREVIEW:
    cv2.destroyAllWindows()
