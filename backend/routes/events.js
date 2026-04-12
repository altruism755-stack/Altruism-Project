const express = require("express");
const { getDb } = require("../models/db");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// GET /api/events
router.get("/", authenticate, (req, res) => {
  const db = getDb();
  const { status, org_id } = req.query;
  let query = "SELECT e.*, o.name as org_name FROM events e LEFT JOIN organizations o ON e.org_id = o.id WHERE 1=1";
  const params = [];
  if (status && status !== "All") { query += " AND e.status = ?"; params.push(status); }
  if (org_id) { query += " AND e.org_id = ?"; params.push(org_id); }
  query += " ORDER BY e.date DESC";
  res.json({ events: db.prepare(query).all(...params) });
});

// GET /api/events/:id
router.get("/:id", authenticate, (req, res) => {
  const db = getDb();
  const event = db.prepare(
    "SELECT e.*, o.name as org_name FROM events e LEFT JOIN organizations o ON e.org_id = o.id WHERE e.id = ?"
  ).get(req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found" });

  const volunteers = db.prepare(
    `SELECT v.id, v.name, v.email, a.status as activity_status, a.hours
     FROM activities a JOIN volunteers v ON a.volunteer_id = v.id
     WHERE a.event_id = ?`
  ).all(event.id);

  res.json({ ...event, volunteers });
});

// POST /api/events
router.post("/", authenticate, authorize("org_admin"), (req, res) => {
  const db = getDb();
  const org = db.prepare("SELECT id FROM organizations WHERE admin_user_id = ?").get(req.user.id);
  if (!org) return res.status(404).json({ error: "Organization not found" });

  const { name, description, location, date, time, duration, max_volunteers, required_skills } = req.body;
  if (!name || !date) return res.status(400).json({ error: "Name and date are required" });

  const result = db.prepare(
    `INSERT INTO events (org_id, name, description, location, date, time, duration, max_volunteers, required_skills, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Upcoming')`
  ).run(org.id, name, description || "", location || "", date, time || "", duration || 0, max_volunteers || 0, required_skills || "");

  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(event);
});

// PUT /api/events/:id
router.put("/:id", authenticate, authorize("org_admin"), (req, res) => {
  const db = getDb();
  const { name, description, location, date, time, duration, max_volunteers, required_skills, status } = req.body;

  db.prepare(
    `UPDATE events SET name = COALESCE(?, name), description = COALESCE(?, description),
     location = COALESCE(?, location), date = COALESCE(?, date), time = COALESCE(?, time),
     duration = COALESCE(?, duration), max_volunteers = COALESCE(?, max_volunteers),
     required_skills = COALESCE(?, required_skills), status = COALESCE(?, status)
     WHERE id = ?`
  ).run(name, description, location, date, time, duration, max_volunteers, required_skills, status, req.params.id);

  res.json(db.prepare("SELECT * FROM events WHERE id = ?").get(req.params.id));
});

// DELETE /api/events/:id
router.delete("/:id", authenticate, authorize("org_admin"), (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM events WHERE id = ?").run(req.params.id);
  res.json({ message: "Event deleted" });
});

module.exports = router;
