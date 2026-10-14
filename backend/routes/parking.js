// ============================================================
// SPTRM – Parking Routes  (slots, lots, dashboard metrics)
// ============================================================
const express           = require('express');
const db                = require('../db');
const { verifyToken }   = require('../middleware/auth');

const router = express.Router();

// ── GET /api/parking/dashboard ────────────────────────────────
router.get('/dashboard', verifyToken, async (_req, res) => {
  try {
    const [[metrics]]  = await db.query('SELECT * FROM v_dashboard_metrics');
    const [slots]      = await db.query('SELECT * FROM v_slot_status');
    res.json({ metrics, slots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/parking/slots ────────────────────────────────────
router.get('/slots', verifyToken, async (req, res) => {
  try {
    const { type, status } = req.query;
    let sql    = 'SELECT * FROM v_slot_status WHERE 1=1';
    const args = [];
    if (type)   { sql += ' AND slot_type = ?'; args.push(type); }
    if (status) { sql += ' AND status = ?';    args.push(status); }
    const [rows] = await db.query(sql, args);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/parking/chargers ─────────────────────────────────
router.get('/chargers', verifyToken, async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM ev_chargers');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
