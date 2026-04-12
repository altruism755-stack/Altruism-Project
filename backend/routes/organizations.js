const express = require("express");
const { getDb } = require("../models/db");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// GET /api/organizations - public list
router.get("/", (req, res) => {
  const db = getDb();
  const orgs = db.prepare("SELECT id, name, description, category, color, secondary_color, initials, founded FROM organizations").all();
  res.json({ organizations: orgs });
});

// GET /api/organizations/:id
router.get("/:id", (req, res) => {
  const db = getDb();
  const org = db.prepare("SELECT * FROM organizations WHERE id = ?").get(req.params.id);
  if (!org) return res.status(404).json({ error: "Organization not found" });

  const volunteers = db.prepare(
    `SELECT v.id, v.name, v.email, v.phone, v.status, ov.department, ov.joined_date
     FROM volunteers v JOIN org_volunteers ov ON v.id = ov.volunteer_id WHERE ov.org_id = ?`
  ).all(org.id);

  const supervisors = db.prepare("SELECT * FROM supervisors WHERE org_id = ?").all(org.id);
  const events = db.prepare("SELECT * FROM events WHERE org_id = ? ORDER BY date DESC").all(org.id);

  res.json({ ...org, volunteers, supervisors, events });
});

// GET /api/organizations/:id/members
router.get("/:id/members", authenticate, (req, res) => {
  const db = getDb();
  const volunteers = db.prepare(
    `SELECT v.*, ov.department, ov.status as org_status, ov.joined_date, s.name as supervisor_name
     FROM volunteers v JOIN org_volunteers ov ON v.id = ov.volunteer_id
     LEFT JOIN supervisors s ON ov.supervisor_id = s.id WHERE ov.org_id = ?`
  ).all(req.params.id);
  const supervisors = db.prepare("SELECT * FROM supervisors WHERE org_id = ?").all(req.params.id);
  res.json({ volunteers, supervisors });
});

// POST /api/organizations/:id/join - volunteer applies to join org
router.post("/:id/join", authenticate, authorize("volunteer"), (req, res) => {
  const db = getDb();
  const vol = db.prepare("SELECT id FROM volunteers WHERE user_id = ?").get(req.user.id);
  if (!vol) return res.status(404).json({ error: "Volunteer profile not found" });

  const existing = db.prepare("SELECT id FROM org_volunteers WHERE org_id = ? AND volunteer_id = ?").get(req.params.id, vol.id);
  if (existing) return res.status(409).json({ error: "Already a member of this organization" });

  db.prepare("INSERT INTO org_volunteers (org_id, volunteer_id, status) VALUES (?, ?, 'Pending')")
    .run(req.params.id, vol.id);

  res.status(201).json({ message: "Application submitted" });
});

// PUT /api/organizations/:orgId/members/:volId/approve
router.put("/:orgId/members/:volId/approve", authenticate, authorize("org_admin"), (req, res) => {
  const db = getDb();
  const { supervisor_id, department } = req.body;
  db.prepare(
    "UPDATE org_volunteers SET status = 'Active', supervisor_id = ?, department = ? WHERE org_id = ? AND volunteer_id = ?"
  ).run(supervisor_id || null, department || null, req.params.orgId, req.params.volId);
  res.json({ message: "Volunteer approved" });
});

module.exports = router;
