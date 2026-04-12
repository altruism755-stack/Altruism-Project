const express = require("express");
const bcrypt = require("bcryptjs");
const { getDb } = require("../models/db");
const { generateToken, authenticate } = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/register
router.post("/register", (req, res) => {
  const db = getDb();
  const { email, password, role, name, phone, city, skills, aboutMe,
          orgName, description, category, website } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: "Email, password, and role are required" });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const hash = bcrypt.hashSync(password, 10);

  const insertUser = db.prepare("INSERT INTO users (email, password, role) VALUES (?, ?, ?)");

  if (role === "volunteer") {
    const tx = db.transaction(() => {
      const userResult = insertUser.run(email, hash, "volunteer");
      const userId = userResult.lastInsertRowid;
      db.prepare(
        "INSERT INTO volunteers (user_id, name, email, phone, city, skills, about_me, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'Active')"
      ).run(userId, name || "", email, phone || "", city || "", JSON.stringify(skills || []), aboutMe || "");
      const vol = db.prepare("SELECT * FROM volunteers WHERE user_id = ?").get(userId);
      const token = generateToken({ id: userId, email, role: "volunteer" });
      return { token, user: { id: userId, email, role: "volunteer" }, volunteer: vol };
    });
    const result = tx();
    return res.status(201).json(result);
  }

  if (role === "org_admin") {
    const tx = db.transaction(() => {
      const userResult = insertUser.run(email, hash, "org_admin");
      const userId = userResult.lastInsertRowid;
      const initials = (orgName || "").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
      db.prepare(
        "INSERT INTO organizations (name, description, category, initials, website, phone, admin_user_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(orgName || "", description || "", category || "", initials, website || "", phone || "", userId);
      const org = db.prepare("SELECT * FROM organizations WHERE admin_user_id = ?").get(userId);
      const token = generateToken({ id: userId, email, role: "org_admin" });
      return { token, user: { id: userId, email, role: "org_admin" }, organization: org };
    });
    const result = tx();
    return res.status(201).json(result);
  }

  return res.status(400).json({ error: "Invalid role. Use 'volunteer' or 'org_admin'" });
});

// POST /api/auth/login
router.post("/login", (req, res) => {
  const db = getDb();
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = generateToken(user);
  let profile = null;

  if (user.role === "volunteer") {
    profile = db.prepare("SELECT * FROM volunteers WHERE user_id = ?").get(user.id);
  } else if (user.role === "supervisor") {
    profile = db.prepare("SELECT * FROM supervisors WHERE user_id = ?").get(user.id);
  } else if (user.role === "org_admin") {
    profile = db.prepare("SELECT * FROM organizations WHERE admin_user_id = ?").get(user.id);
  }

  res.json({ token, user: { id: user.id, email: user.email, role: user.role }, profile });
});

// GET /api/auth/me
router.get("/me", authenticate, (req, res) => {
  const db = getDb();
  const user = db.prepare("SELECT id, email, role, created_at FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  let profile = null;
  if (user.role === "volunteer") {
    profile = db.prepare("SELECT * FROM volunteers WHERE user_id = ?").get(user.id);
  } else if (user.role === "supervisor") {
    profile = db.prepare("SELECT * FROM supervisors WHERE user_id = ?").get(user.id);
  } else if (user.role === "org_admin") {
    profile = db.prepare("SELECT * FROM organizations WHERE admin_user_id = ?").get(user.id);
  }

  res.json({ user, profile });
});

module.exports = router;
