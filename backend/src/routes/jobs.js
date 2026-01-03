import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /jobs (only your jobs)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, company, title, status, location, link, notes, applied_date, created_at, updated_at
       FROM jobs
       WHERE user_id=$1
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ ok: true, jobs: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /jobs
router.post("/", async (req, res) => {
  const { company, title, status, location, link, notes, applied_date } = req.body || {};
  if (!company || !title) return res.status(400).json({ ok: false, error: "company and title required" });

  try {
    const result = await pool.query(
      `INSERT INTO jobs (user_id, company, title, status, location, link, notes, applied_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, company, title, status, location, link, notes, applied_date, created_at, updated_at`,
      [
        req.user.id,
        company,
        title,
        status || "applied",
        location || null,
        link || null,
        notes || null,
        applied_date || null
      ]
    );
    res.json({ ok: true, job: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
