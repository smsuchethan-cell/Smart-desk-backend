"""Help bot — keyword-matched FAQ plus live figures pulled from the database.

Deliberately not an LLM: no API key, no per-message cost, nothing to keep
paying for. It matches a question against a fixed set of known intents, so
it answers what it's been taught and honestly says so when it hasn't.
"""
import re
from datetime import date, datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.db import get_db
from models.student import Student
from models.school_attendance import SchoolAttendance
from models.leave import Leave
from models.product import Product
from models.scan_log import ScanLog
from models.enquiry import Enquiry
from models.event import Event
from models.attendee import Attendee
from models.attendance import Attendance
from models.employee import Employee
from models.employee_checkin import EmployeeCheckin
from models.meeting import Meeting
from models.stall_status import StallStatus
from utils.auth import require_auth

router = APIRouter()


class ChatPayload(BaseModel):
    question: str


# ── Live figures ──────────────────────────────────────────────────────────────

def _school_attendance(db: Session) -> str:
    today = date.today()
    total = db.query(Student).count()
    present = (
        db.query(SchoolAttendance)
        .filter(SchoolAttendance.marked_at >= today)
        .count()
    )
    on_leave = (
        db.query(Leave)
        .filter(Leave.date_from <= today, Leave.date_to >= today)
        .count()
    )
    absent = max(total - present - on_leave, 0)
    return (
        f"Today: {present} present, {on_leave} on leave, {absent} absent, "
        f"out of {total} registered students."
    )


def _student_count(db: Session) -> str:
    return f"There are {db.query(Student).count()} students registered."


def _retail_stats(db: Session) -> str:
    return (
        f"{db.query(Product).count()} products, "
        f"{db.query(ScanLog).count()} total QR scans, "
        f"{db.query(Enquiry).count()} leads captured."
    )


def _footfall(db: Session) -> str:
    row = db.query(StallStatus).filter(StallStatus.id == 1).first()
    if not row:
        return "No footfall recorded yet — the Pi counter hasn't reported in."
    live = (
        row.last_heartbeat is not None
        and (datetime.utcnow() - row.last_heartbeat).total_seconds() < 30
    )
    return (
        f"Footfall today: {row.today_count}. Yesterday: {row.yesterday_count}. "
        f"All-time: {row.total_count}. Camera is currently "
        f"{'online' if live else 'offline'}."
    )


def _event_stats(db: Session) -> str:
    today = date.today()
    checked_in_today = (
        db.query(Attendance)
        .filter(Attendance.checked_in_at >= today)
        .count()
    )
    return (
        f"{db.query(Event).count()} events, "
        f"{db.query(Attendee).count()} registered attendees, "
        f"{db.query(Attendance).count()} total check-ins "
        f"({checked_in_today} of them today)."
    )


def _corporate_stats(db: Session) -> str:
    today = date.today()
    checked_in = (
        db.query(EmployeeCheckin)
        .filter(EmployeeCheckin.checked_in_at >= today)
        .count()
    )
    return (
        f"{db.query(Employee).count()} employees, {checked_in} checked in today, "
        f"{db.query(Meeting).count()} meetings scheduled."
    )


# ── Intents ───────────────────────────────────────────────────────────────────
# "strong" keywords are distinctive enough that one alone identifies the intent
# (worth 2 points); "weak" ones are supporting hints (1 point each). An intent
# fires at 2+ points, so either one strong word or two weak ones. Filler words
# like "how"/"many" are deliberately absent — they appear in nearly every
# question and would otherwise let the wrong intent win on generic words alone.

MIN_SCORE = 2

INTENTS = [
    # ── Live figures ──
    {"strong": ["present", "absent", "attendance"], "weak": ["student", "school", "today", "class"], "live": _school_attendance},
    {"strong": ["enrolled", "roster"], "weak": ["student", "registered", "total", "count"], "live": _student_count},
    {"strong": ["scan", "lead", "enquiry"], "weak": ["product", "retail", "sale", "total", "count"], "live": _retail_stats},
    {"strong": ["footfall"], "weak": ["visitor", "counter", "camera", "traffic", "count"], "live": _footfall},
    {"strong": ["attendee"], "weak": ["event", "checked", "checkin", "registered", "count"], "live": _event_stats},
    {"strong": ["employee", "meeting"], "weak": ["staff", "corporate", "department", "checked", "count"], "live": _corporate_stats},

    # ── How-to ──
    {
        "strong": [], "weak": ["register", "add", "new", "student", "photo", "enroll"],
        "answer": "Go to School mode → Students → \"+ Register Student\". Name and roll number are required, and you must attach a clear front-facing reference photo — that photo is what the Pi camera matches faces against, so attendance won't work without it.",
    },
    {
        "strong": [], "weak": ["add", "new", "product", "create", "item", "catalog"],
        "answer": "Go to Retail mode → Products → \"+ Add Product\". Only the name is required; price, description, specs, image URL and video URL are all optional. A QR code is generated for the product automatically.",
    },
    {
        "strong": ["badge"], "weak": ["print", "check", "checkin", "attendee", "gate"],
        "answer": "Two ways: (1) On the Attendees page, click the green \"✅ Check In\" button on that person's row, then \"Confirm Check-In & Print Badge\". (2) At an unstaffed gate, the visitor scans the gate QR, types their entry code, and the badge print dialog pops up automatically.",
    },
    {
        "strong": ["registration"], "weak": ["register", "qr", "desk", "print", "code", "sign", "signup", "event", "visitor", "people", "guest"],
        "answer": "Go to Attendees (or Visitors in Corporate mode), pick a specific event from the \"All Events\" dropdown at the top, and a QR code appears in the banner below with a \"⬇ Download QR\" button. Print that and place it at your registration desk — visitors scan it to register themselves.",
    },
    {
        "strong": ["kiosk", "entrance"], "weak": ["gate", "qr", "check", "self", "entry"],
        "answer": "The gate check-in QR is on the Attendees page, in the second banner (always visible, not tied to any event). Download and print it for your entrance — visitors scan it, type the entry code they got when registering, and check themselves in.",
    },
    {
        "strong": ["holiday"], "weak": ["add", "school", "calendar", "day"],
        "answer": "School mode → Holidays. Use the left panel: pick a date, type the holiday name, click \"+ Add\". Both fields are required.",
    },
    # Must stay ahead of the leave/absence intent below: "leave" is the verb
    # here ("what time did they leave") and the noun there ("record a leave"),
    # and ties are resolved by list order.
    {
        "strong": ["departure", "left", "timing"], "weak": ["time", "leave", "arrive", "arrival", "student", "attendance", "entry", "exit"],
        "answer": "School mode → Attendance shows each student's arrival time and departure time for the day. The single entrance camera handles both: the first time it recognises a student they're marked present with that arrival time, and the last time it sees them that day becomes their departure time.",
    },
    {
        "strong": ["leave"], "weak": ["student", "record", "sick", "apply", "absent"],
        "answer": "School mode → Holidays → right panel (\"Student Leaves\"). Select the student, pick the from/to dates, optionally add a reason, then \"+ Record Leave\". A student on approved leave won't be counted as absent.",
    },
    {
        "strong": ["export", "excel"], "weak": ["download", "report", "list", "data"],
        "answer": "Attendees page has \"⬇ Export Excel\" for the visitor/attendee list (respects the event filter). School mode → Analytics has \"⬇ Export Annual Report\" for the full year's attendance. Corporate mode → Reports has \"⬇ Export Visitor Log\".",
    },
    {
        "strong": ["mode"], "weak": ["switch", "change", "school", "retail", "event", "corporate"],
        "answer": "Click the mode name in the top-right corner of the screen (e.g. \"🎓 School Mode ⇄\"). That takes you back to the mode picker, where you can choose School, Corporate, Event, or Retail. The choice is remembered on that device.",
    },
    {
        "strong": ["face", "recognition"], "weak": ["attendance", "camera", "pi", "work"],
        "answer": "The Raspberry Pi camera watches the entrance and matches faces against the reference photos you uploaded when registering students. On a confident match it marks that student present — once per day only. When the same student passes the camera again later, that becomes their recorded \"left\" time.",
    },
    {
        "strong": ["anonymous"], "weak": ["footfall", "counter", "count", "work", "unique"],
        "answer": "The Pi camera counts unique visitors per day without identifying anyone — it only asks \"have I seen this face today?\", so someone walking past repeatedly is counted once. The memory is wiped at midnight, so nobody is tracked across days.",
    },
    {
        "strong": ["device", "browser"], "weak": ["scan", "scanned", "customer", "track", "location", "analytics", "city", "activity"],
        "answer": "When a customer scans a product QR, their device type, browser, approximate city and how long they stayed on the page are captured automatically — no form for them to fill in. It all shows on Retail mode → Dashboard → \"📡 Live Scan Activity\".",
    },
    {
        "strong": ["password", "login"], "weak": ["change", "forgot", "access", "log"],
        "answer": "The staff password is set on the server (the ADMIN_PASSWORD environment variable in your Render dashboard). To change it, update that value and save — the service restarts automatically and the new password applies. After 5 wrong attempts you're locked out for a few minutes.",
    },
    {
        "strong": ["delete", "remove"], "weak": ["student", "product", "attendee", "record"],
        "answer": "Every list has a 🗑 button on each row. It always asks for confirmation first. Deleting a record also removes its related data (a deleted attendee loses their check-in record, a deleted product loses its scan history).",
    },
]


def _words(question: str) -> set:
    """Lowercased words plus a naive singular form, so 'scans' matches 'scan'."""
    raw = re.sub(r"[^a-z0-9\s]", " ", question.lower()).split()
    out = set(raw)
    out.update(w[:-1] for w in raw if w.endswith("s") and len(w) > 3)
    return out


def _score(words: set, intent: dict) -> int:
    strong = sum(2 for k in intent.get("strong", []) if k in words)
    weak = sum(1 for k in intent.get("weak", []) if k in words)
    return strong + weak


FALLBACK = (
    "I don't have an answer for that one. Try rephrasing, or check the full "
    "operator manual — it covers every button on every screen. You can also ask "
    "me things like \"how many students are present today?\" or \"how do I print a badge?\""
)


@router.post("/chat", dependencies=[Depends(require_auth)])
def chat(payload: ChatPayload, db: Session = Depends(get_db)):
    question = payload.question.strip()
    if not question:
        return {"answer": FALLBACK}

    words = _words(question)
    best, best_score = None, 0
    for intent in INTENTS:
        score = _score(words, intent)
        if score > best_score:
            best, best_score = intent, score

    if not best or best_score < MIN_SCORE:
        return {"answer": FALLBACK}

    if "live" in best:
        return {"answer": best["live"](db)}
    return {"answer": best["answer"]}
