import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

const router = Router();

function signToken(user) {
  return jwt.sign(
    { email: user.email },
    process.env.JWT_SECRET,
    { subject: String(user.id), expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

// POST /auth/signup  { email, password }
router.post("/signup", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: "Email and password required" });
  }

  const normalized = String(email).trim().toLowerCase();
  if (password.length < 8) {
    return res.status(400).json({ ok: false, error: "Password must be at least 8 chars" });
  }

  try {
    const existing = await pool.query("SELECT id FROM users WHERE email=$1", [normalized]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ ok: false, error: "Email already in use" });
    }

    const hash = await bcrypt.hash(password, 12);
    const created = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1,$2) RETURNING id,email,created_at",
      [normalized, hash]
    );

    const user = created.rows[0];
    const token = signToken(user);
    return res.json({ ok: true, token, user });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /auth/login  { email, password }
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: "Email and password required" });
  }

  const normalized = String(email).trim().toLowerCase();

  try {
    const found = await pool.query(
      "SELECT id,email,password_hash,created_at FROM users WHERE email=$1",
      [normalized]
    );
    if (found.rowCount === 0) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    const user = found.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ ok: false, error: "Invalid credentials" });

    const token = signToken(user);
    return res.json({ ok: true, token, user: { id: user.id, email: user.email, created_at: user.created_at } });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
