const express = require("express");
const { getDb } = require("../models/db");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// GET /api/certificates?volunteer_id=
router.get("/", authenticate, (req, res) => {
  const db = getDb();
  const { volunteer_id } = req.query;
  let query = `SELECT c.*, o.name as org_name, e.name as event_name, v.name as volunteer_name
               FROM certificates c
               JOIN organizations o ON c.org_id = o.id
               LEFT JOIN events e ON c.event_id = e.id
               JOIN volunteers v ON c.volunteer_id = v.id WHERE 1=1`;
  const params = [];
  if (volunteer_id) { query += " AND c.volunteer_id = ?"; params.push(volunteer_id); }
  query += " ORDER BY c.issued_date DESC";
  res.json({ certificates: db.prepare(query).all(...params) });
});

// POST /api/certificates - issue certificate (org_admin)
router.post("/", authenticate, authorize("org_admin"), (req, res) => {
  const db = getDb();
  const org = db.prepare("SELECT id FROM organizations WHERE admin_user_id = ?").get(req.user.id);
  if (!org) return res.status(404).json({ error: "Organization not found" });

  const { volunteer_id, event_id, type, hours } = req.body;
  if (!volunteer_id || !type) return res.status(400).json({ error: "volunteer_id and type are required" });

  const result = db.prepare(
    "INSERT INTO certificates (volunteer_id, org_id, event_id, type, hours) VALUES (?, ?, ?, ?, ?)"
  ).run(volunteer_id, org.id, event_id || null, type, hours || 0);

  const cert = db.prepare(
    `SELECT c.*, o.name as org_name, e.name as event_name FROM certificates c
     JOIN organizations o ON c.org_id = o.id LEFT JOIN events e ON c.event_id = e.id WHERE c.id = ?`
  ).get(result.lastInsertRowid);

  res.status(201).json(cert);
});

module.exports = router;
