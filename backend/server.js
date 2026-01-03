import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// IMPORTANT: dotenv.config() must run before we use process.env here
dotenv.config();

import authRoutes from "./src/routes/auth.js";
import jobsRoutes from "./src/routes/jobs.js";
import { pool } from "./src/db.js";

const app = express();

// CORS: allow your frontend (5174)
app.use(
  cors({
    origin: (process.env.CORS_ORIGIN || "http://localhost:5174")
      .split(",")
      .map((s) => s.trim()),
    credentials: true,
  })
);

app.use(express.json());

// Root
app.get("/", (req, res) => {
  res.send("Backend is running ✅ Try /health");
});

// Health check (tests DB)
app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() as now");
    res.json({ ok: true, now: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Setup (creates users + per-user jobs table)
app.get("/setup", async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS jobs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        company TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'applied',
        location TEXT,
        link TEXT,
        notes TEXT,
        applied_date DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
    `);

    res.json({ ok: true, message: "Tables ready: users, jobs" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ✅ Step 5 routes
app.use("/auth", authRoutes);
app.use("/jobs", jobsRoutes);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
