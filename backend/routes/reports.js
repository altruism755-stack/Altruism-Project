const express = require("express");
const { getDb } = require("../models/db");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// GET /api/reports/summary
router.get("/summary", authenticate, authorize("org_admin"), (req, res) => {
  const db = getDb();
  const org = db.prepare("SELECT id FROM organizations WHERE admin_user_id = ?").get(req.user.id);
  if (!org) return res.status(404).json({ error: "Organization not found" });

  const totalVolunteers = db.prepare("SELECT COUNT(*) as c FROM org_volunteers WHERE org_id = ?").get(org.id).c;
  const activeVolunteers = db.prepare("SELECT COUNT(*) as c FROM org_volunteers WHERE org_id = ? AND status = 'Active'").get(org.id).c;
  const totalHours = db.prepare("SELECT COALESCE(SUM(hours), 0) as h FROM activities WHERE org_id = ? AND status = 'Approved'").get(org.id).h;
  const pendingActivities = db.prepare("SELECT COUNT(*) as c FROM activities WHERE org_id = ? AND status = 'Pending'").get(org.id).c;
  const completedEvents = db.prepare("SELECT COUNT(*) as c FROM events WHERE org_id = ? AND status = 'Completed'").get(org.id).c;
  const totalEvents = db.prepare("SELECT COUNT(*) as c FROM events WHERE org_id = ?").get(org.id).c;

  res.json({ totalVolunteers, activeVolunteers, totalHours, pendingActivities, completedEvents, totalEvents });
});

// GET /api/reports/volunteer-hours
router.get("/volunteer-hours", authenticate, authorize("org_admin"), (req, res) => {
  const db = getDb();
  const org = db.prepare("SELECT id FROM organizations WHERE admin_user_id = ?").get(req.user.id);
  if (!org) return res.status(404).json({ error: "Organization not found" });

  const { date_from, date_to } = req.query;

  let query = `SELECT v.id, v.name, v.email, v.status,
    COALESCE(SUM(CASE WHEN a.status = 'Approved' THEN a.hours ELSE 0 END), 0) as total_hours,
    COUNT(CASE WHEN a.status = 'Approved' THEN 1 END) as events_attended,
    MAX(CASE WHEN a.status = 'Approved' THEN a.date END) as last_activity
    FROM volunteers v
    JOIN org_volunteers ov ON v.id = ov.volunteer_id AND ov.org_id = ?
    LEFT JOIN activities a ON v.id = a.volunteer_id AND a.org_id = ?`;
  const params = [org.id, org.id];

  if (date_from) { query += " AND a.date >= ?"; params.push(date_from); }
  if (date_to) { query += " AND a.date <= ?"; params.push(date_to); }

  query += " GROUP BY v.id ORDER BY total_hours DESC";

  const report = db.prepare(query).all(...params);
  const totalHours = report.reduce((s, r) => s + r.total_hours, 0);
  const totalEvents = report.reduce((s, r) => s + r.events_attended, 0);

  res.json({ report, totalHours, totalEvents });
});

// GET /api/reports/export-csv
router.get("/export-csv", authenticate, authorize("org_admin"), (req, res) => {
  const db = getDb();
  const org = db.prepare("SELECT id FROM organizations WHERE admin_user_id = ?").get(req.user.id);
  if (!org) return res.status(404).json({ error: "Organization not found" });

  const rows = db.prepare(
    `SELECT v.name, v.email, v.status,
     COALESCE(SUM(CASE WHEN a.status='Approved' THEN a.hours ELSE 0 END),0) as total_hours,
     COUNT(CASE WHEN a.status='Approved' THEN 1 END) as events
     FROM volunteers v JOIN org_volunteers ov ON v.id=ov.volunteer_id AND ov.org_id=?
     LEFT JOIN activities a ON v.id=a.volunteer_id AND a.org_id=?
     GROUP BY v.id ORDER BY total_hours DESC`
  ).all(org.id, org.id);

  let csv = "Name,Email,Status,Total Hours,Events Attended\n";
  for (const r of rows) {
    csv += `"${r.name}","${r.email}","${r.status}",${r.total_hours},${r.events}\n`;
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=volunteer_report.csv");
  res.send(csv);
});

module.exports = router;
