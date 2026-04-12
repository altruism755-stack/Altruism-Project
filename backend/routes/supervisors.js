const express = require("express");
const bcrypt = require("bcryptjs");
const { getDb } = require("../models/db");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// GET /api/supervisors
router.get("/", authenticate, authorize("org_admin"), (req, res) => {
  const db = getDb();
  const org = db.prepare("SELECT id FROM organizations WHERE admin_user_id = ?").get(req.user.id);
  if (!org) return res.status(404).json({ error: "Organization not found" });

  const supervisors = db.prepare(
    `SELECT s.*, (SELECT COUNT(*) FROM org_volunteers ov WHERE ov.supervisor_id = s.id) as assigned_volunteers
     FROM supervisors s WHERE s.org_id = ?`
  ).all(org.id);

  res.json({ supervisors });
});

// POST /api/supervisors - invite/create supervisor (org_admin)
router.post("/", authenticate, authorize("org_admin"), (req, res) => {
  const db = getDb();
  const { name, email, phone, team } = req.body;
  if (!name || !email) return res.status(400).json({ error: "Name and email are required" });

  const org = db.prepare("SELECT id FROM organizations WHERE admin_user_id = ?").get(req.user.id);
  if (!org) return res.status(404).json({ error: "Organization not found" });

  const tx = db.transaction(() => {
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    let userId;
    if (existing) {
      userId = existing.id;
      db.prepare("UPDATE users SET role = 'supervisor' WHERE id = ?").run(userId);
    } else {
      const hash = bcrypt.hashSync("supervisor123", 10);
      const result = db.prepare("INSERT INTO users (email, password, role) VALUES (?, ?, 'supervisor')").run(email, hash);
      userId = result.lastInsertRowid;
    }

    const existingSup = db.prepare("SELECT id FROM supervisors WHERE user_id = ?").get(userId);
    if (existingSup) {
      return { error: "Supervisor already exists" };
    }

    db.prepare(
      "INSERT INTO supervisors (user_id, name, email, phone, team, org_id, status) VALUES (?, ?, ?, ?, ?, ?, 'Active')"
    ).run(userId, name, email, phone || "", team || "", org.id);

    return db.prepare("SELECT * FROM supervisors WHERE user_id = ?").get(userId);
  });

  const result = tx();
  if (result.error) return res.status(409).json(result);
  res.status(201).json(result);
});

// DELETE /api/supervisors/:id
router.delete("/:id", authenticate, authorize("org_admin"), (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM supervisors WHERE id = ?").run(req.params.id);
  res.json({ message: "Supervisor removed" });
});

module.exports = router;
