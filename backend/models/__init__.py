# models/__init__.py
# Importing all models here ensures they are registered with SQLAlchemy's
# metadata before Base.metadata.create_all() is called in main.py
from models.product import Product          # noqa
from models.event import Event              # noqa
from models.attendee import Attendee        # noqa
from models.attendance import Attendance    # noqa
from models.scan_log import ScanLog         # noqa
from models.enquiry import Enquiry          # noqa
