const express = require("express");
const { getDb } = require("../models/db");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// GET /api/activities - list activities
router.get("/", authenticate, (req, res) => {
  const db = getDb();
  const { volunteer_id, status, supervisor_id } = req.query;

  let query = `SELECT a.*, v.name as volunteer_name, e.name as event_name
               FROM activities a
               LEFT JOIN volunteers v ON a.volunteer_id = v.id
               LEFT JOIN events e ON a.event_id = e.id WHERE 1=1`;
  const params = [];

  if (volunteer_id) { query += " AND a.volunteer_id = ?"; params.push(volunteer_id); }
  if (status && status !== "All") { query += " AND a.status = ?"; params.push(status); }
  if (supervisor_id) {
    query += " AND a.volunteer_id IN (SELECT ov.volunteer_id FROM org_volunteers ov WHERE ov.supervisor_id = ?)";
    params.push(supervisor_id);
  }
  query += " ORDER BY a.date DESC";

  res.json({ activities: db.prepare(query).all(...params) });
});

// POST /api/activities - log new activity (volunteer)
router.post("/", authenticate, authorize("volunteer"), (req, res) => {
  const db = getDb();
  const vol = db.prepare("SELECT id FROM volunteers WHERE user_id = ?").get(req.user.id);
  if (!vol) return res.status(404).json({ error: "Volunteer profile not found" });

  const { event_id, date, hours, description } = req.body;
  if (!date || !hours) return res.status(400).json({ error: "Date and hours are required" });

  let orgId = null;
  if (event_id) {
    const event = db.prepare("SELECT org_id FROM events WHERE id = ?").get(event_id);
    if (event) orgId = event.org_id;
  }

  const result = db.prepare(
    "INSERT INTO activities (volunteer_id, event_id, org_id, date, hours, description, status) VALUES (?, ?, ?, ?, ?, ?, 'Pending')"
  ).run(vol.id, event_id || null, orgId, date, hours, description || "");

  const activity = db.prepare(
    `SELECT a.*, e.name as event_name FROM activities a
     LEFT JOIN events e ON a.event_id = e.id WHERE a.id = ?`
  ).get(result.lastInsertRowid);

  res.status(201).json(activity);
});

// PUT /api/activities/:id/approve
router.put("/:id/approve", authenticate, authorize("supervisor", "org_admin"), (req, res) => {
  const db = getDb();
  let reviewerId = null;
  if (req.user.role === "supervisor") {
    const sup = db.prepare("SELECT id FROM supervisors WHERE user_id = ?").get(req.user.id);
    if (sup) reviewerId = sup.id;
  }

  db.prepare("UPDATE activities SET status = 'Approved', reviewed_by = ? WHERE id = ?")
    .run(reviewerId, req.params.id);

  res.json({ message: "Activity approved" });
});

// PUT /api/activities/:id/reject
router.put("/:id/reject", authenticate, authorize("supervisor", "org_admin"), (req, res) => {
  const db = getDb();
  let reviewerId = null;
  if (req.user.role === "supervisor") {
    const sup = db.prepare("SELECT id FROM supervisors WHERE user_id = ?").get(req.user.id);
    if (sup) reviewerId = sup.id;
  }

  db.prepare("UPDATE activities SET status = 'Rejected', reviewed_by = ? WHERE id = ?")
    .run(reviewerId, req.params.id);

  res.json({ message: "Activity rejected" });
});

module.exports = router;
