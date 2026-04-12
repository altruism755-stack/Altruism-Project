const express = require("express");
const { getDb } = require("../models/db");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// GET /api/volunteers - list all volunteers (org_admin, supervisor)
router.get("/", authenticate, authorize("org_admin", "supervisor"), (req, res) => {
  const db = getDb();
  const { status, supervisor, search, page = 1, limit = 20 } = req.query;
  let query = "SELECT v.*, ov.department, ov.supervisor_id, s.name as supervisor_name FROM volunteers v LEFT JOIN org_volunteers ov ON v.id = ov.volunteer_id LEFT JOIN supervisors s ON ov.supervisor_id = s.id WHERE 1=1";
  const params = [];

  if (status) { query += " AND v.status = ?"; params.push(status); }
  if (supervisor) {
    query += " AND s.name = ?"; params.push(supervisor);
  }
  if (search) {
    query += " AND (v.name LIKE ? OR v.email LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  const offset = (Number(page) - 1) * Number(limit);
  const countQuery = query.replace(/SELECT .* FROM/, "SELECT COUNT(*) as total FROM");
  const total = db.prepare(countQuery).get(...params)?.total || 0;

  query += ` LIMIT ? OFFSET ?`;
  params.push(Number(limit), offset);

  const volunteers = db.prepare(query).all(...params);
  res.json({ volunteers, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
});

// GET /api/volunteers/:id
router.get("/:id", authenticate, (req, res) => {
  const db = getDb();
  const vol = db.prepare("SELECT * FROM volunteers WHERE id = ?").get(req.params.id);
  if (!vol) return res.status(404).json({ error: "Volunteer not found" });

  const activities = db.prepare(
    "SELECT a.*, e.name as event_name FROM activities a LEFT JOIN events e ON a.event_id = e.id WHERE a.volunteer_id = ? ORDER BY a.date DESC"
  ).all(vol.id);

  const orgs = db.prepare(
    "SELECT o.* FROM organizations o JOIN org_volunteers ov ON o.id = ov.org_id WHERE ov.volunteer_id = ?"
  ).all(vol.id);

  const certificates = db.prepare(
    "SELECT c.*, o.name as org_name, e.name as event_name FROM certificates c JOIN organizations o ON c.org_id = o.id LEFT JOIN events e ON c.event_id = e.id WHERE c.volunteer_id = ?"
  ).all(vol.id);

  const totalHours = activities.filter(a => a.status === "Approved").reduce((s, a) => s + a.hours, 0);

  res.json({ ...vol, activities, organizations: orgs, certificates, totalHours });
});

// PUT /api/volunteers/:id - update volunteer profile
router.put("/:id", authenticate, (req, res) => {
  const db = getDb();
  const { name, phone, city, skills, about_me } = req.body;
  db.prepare(
    "UPDATE volunteers SET name = COALESCE(?, name), phone = COALESCE(?, phone), city = COALESCE(?, city), skills = COALESCE(?, skills), about_me = COALESCE(?, about_me) WHERE id = ?"
  ).run(name, phone, city, skills ? JSON.stringify(skills) : null, about_me, req.params.id);

  const updated = db.prepare("SELECT * FROM volunteers WHERE id = ?").get(req.params.id);
  res.json(updated);
});

// PUT /api/volunteers/:id/status - approve/suspend volunteer (org_admin)
router.put("/:id/status", authenticate, authorize("org_admin"), (req, res) => {
  const db = getDb();
  const { status } = req.body;
  if (!["Active", "Pending", "Suspended"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  db.prepare("UPDATE volunteers SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ message: "Status updated" });
});

module.exports = router;
