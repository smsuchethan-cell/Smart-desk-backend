import axios from "axios";

const BASE = "http://localhost:8000/api/v1";

const api = axios.create({ baseURL: BASE });

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
export const getAttendees   = (eventId) => api.get("/attendees", { params: { event_id: eventId } });
export const registerAttendee = (data)  => api.post("/attendees/register", data);
export const checkinAttendee  = (qrId)  => api.post(`/attendees/checkin/${qrId}`);

// ── Enquiries ───────────────────────────────────────────────
export const getEnquiries   = ()        => api.get("/enquiries");
export const submitEnquiry  = (data)    => api.post("/enquiries", data);
export const deleteEnquiry  = (id)      => api.delete(`/enquiries/${id}`);

// ── Analytics ───────────────────────────────────────────────
export const getSummary     = ()        => api.get("/analytics/summary");
export const getScanStats   = ()        => api.get("/analytics/scans");
export const getTopProducts = ()        => api.get("/analytics/top-products");
export const getAttendanceStats = ()    => api.get("/analytics/attendance");

// ── QR Scanner ──────────────────────────────────────────────
export const scanQR         = (qrData)  => api.post(`/qr/scan?qr_data=${encodeURIComponent(qrData)}`);

export default api;
