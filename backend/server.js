const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth");
const volunteersRoutes = require("./routes/volunteers");
const supervisorsRoutes = require("./routes/supervisors");
const eventsRoutes = require("./routes/events");
const activitiesRoutes = require("./routes/activities");
const certificatesRoutes = require("./routes/certificates");
const reportsRoutes = require("./routes/reports");
const organizationsRoutes = require("./routes/organizations");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/volunteers", volunteersRoutes);
app.use("/api/supervisors", supervisorsRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/activities", activitiesRoutes);
app.use("/api/certificates", certificatesRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/organizations", organizationsRoutes);

// Health check
app.get("/api/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../dist")));
  app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "../dist/index.html")));
}

// Error handler
app.use((err, _req, res, _next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Altruism API running on http://localhost:${PORT}`);
});

module.exports = app;
