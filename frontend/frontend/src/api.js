import axios from "axios";

export const ROOT = "https://smart-desk-backend-11.onrender.com";
const BASE = `${ROOT}/api/v1`;

const api = axios.create({ baseURL: BASE });

// ── Keep-alive ping ─────────────────────────────────────────
// Render's free tier spins the backend down after ~15min idle, so the first
// request after a sleep can take 30-60s. Pinging /health while the app is
// open keeps it warm for the current visitor (doesn't help the very first
// cold visitor of the day — that needs an external uptime pinger).
const PING_INTERVAL_MS = 10 * 60 * 1000;
const pingBackend = () => axios.get(`${ROOT}/health`, { timeout: 10000 }).catch(() => {});
pingBackend();
setInterval(pingBackend, PING_INTERVAL_MS);

// ── Products ────────────────────────────────────────────────
export const getProducts    = ()        => api.get("/products");
export const getProduct     = (id)      => api.get(`/products/${id}`);
export const createProduct  = (data)    => api.post("/products", data);
export const updateProduct  = (id, data)=> api.put(`/products/${id}`, data);
export const deleteProduct  = (id)      => api.delete(`/products/${id}`);

// ── Events ──────────────────────────────────────────────────
export const getEvents      = ()        => api.get("/events");
export const getEvent       = (id)      => api.get(`/events/${id}`);
export const createEvent    = (data)    => api.post("/events", data);
export const updateEvent    = (id, data)=> api.put(`/events/${id}`, data);
export const deleteEvent    = (id)      => api.delete(`/events/${id}`);

// ── Attendees ───────────────────────────────────────────────
export const getAttendees     = (eventId) => api.get("/attendees", { params: { event_id: eventId } });
export const registerAttendee = (data)    => api.post("/attendees/register", data);
export const checkinAttendee  = (qrId)    => api.post(`/attendees/checkin/${qrId}`);
export const deleteAttendee   = (id)      => api.delete(`/attendees/${id}`);
export const getAttendeeByQr  = (qrId)    => api.get(`/attendees/qr/${qrId}`);

// ── Enquiries ───────────────────────────────────────────────
export const getEnquiries   = ()        => api.get("/enquiries");
export const submitEnquiry  = (data)    => api.post("/enquiries", data);
export const deleteEnquiry  = (id)      => api.delete(`/enquiries/${id}`);

// ── Analytics ───────────────────────────────────────────────
export const getSummary          = ()   => api.get("/analytics/summary");
export const getScanStats        = ()   => api.get("/analytics/scans");
export const getTopProducts      = ()   => api.get("/analytics/top-products");
export const getAttendanceStats  = ()   => api.get("/analytics/attendance");
export const getAttendanceSummary = ()  => api.get("/analytics/attendance-summary");
export const getGpsLocation = () => api.get("/stall/gps");
export const getHourlyTraffic  = ()      => api.get("/analytics/hourly-traffic");
export const getRecentCheckins = (limit=10) => api.get("/analytics/recent-checkins", { params: { limit } });

// ── Stall Counter ────────────────────────────────────────────
export const getStallCount = ()  => api.get("/stall/count");   // ← NEW

// ── QR Scanner ──────────────────────────────────────────────
export const scanQR = (qrData) => api.post(`/qr/scan?qr_data=${encodeURIComponent(qrData)}`);

// ── Students (School mode) ───────────────────────────────────
export const getStudents   = (classSection) => api.get("/students", { params: { class_section: classSection } });
export const createStudent = (formData)     => api.post("/students", formData, { headers: { "Content-Type": "multipart/form-data" } });
export const deleteStudent = (id)           => api.delete(`/students/${id}`);
export const getTodayAttendance = () => api.get("/school/attendance/today");
export const getClassBreakdown  = () => api.get("/school/analytics/class-breakdown");

// ── Holidays (School mode) ───────────────────────────────────
export const getHolidays   = ()     => api.get("/school/holidays");
export const createHoliday = (data) => api.post("/school/holidays", data);
export const deleteHoliday = (id)   => api.delete(`/school/holidays/${id}`);

// ── Leaves (School mode) ──────────────────────────────────────
export const getLeaves   = (studentId) => api.get("/school/leaves", { params: { student_id: studentId } });
export const createLeave = (data)      => api.post("/school/leaves", data);
export const deleteLeave = (id)        => api.delete(`/school/leaves/${id}`);

// ── Employees (Corporate mode) ────────────────────────────────
export const getEmployees   = ()        => api.get("/employees");
export const createEmployee = (formData)=> api.post("/employees", formData, { headers: { "Content-Type": "multipart/form-data" } });
export const deleteEmployee = (id)      => api.delete(`/employees/${id}`);
export const checkinEmployee = (id)     => api.post(`/employees/${id}/checkin`);
export const getEmployeeCheckinsToday = () => api.get("/employees/checkins/today");
export const getDepartmentBreakdown = () => api.get("/corporate/analytics/department-breakdown");

// ── Meetings (Corporate mode) ─────────────────────────────────
export const getMeetings       = () => api.get("/meetings");
export const getMeetingsStatus = () => api.get("/meetings/status");
export const createMeeting     = (data) => api.post("/meetings", data);
export const deleteMeeting     = (id)   => api.delete(`/meetings/${id}`);

export default api;