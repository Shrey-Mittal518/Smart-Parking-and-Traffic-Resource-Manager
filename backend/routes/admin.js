// ============================================================
// SPTRM – Admin Routes  (slot management, all users, payments)
// ============================================================
const express                      = require('express');
const db                           = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/admin/users ──────────────────────────────────────
router.get('/users', verifyToken, requireAdmin, async (_req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/admin/all-reservations ──────────────────────────
router.get('/all-reservations', verifyToken, requireAdmin, async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM v_active_reservations');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/admin/payments ───────────────────────────────────
router.get('/payments', verifyToken, requireAdmin, async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM v_payment_summary ORDER BY transaction_time DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PATCH /api/admin/slots/:id ────────────────────────────────
// Admin can force-set a slot status (maintenance, etc.)
router.patch('/slots/:id', verifyToken, requireAdmin, async (req, res) => {
  const { status } = req.body;
  const allowed    = ['AVAILABLE','OCCUPIED','RESERVED','MAINTENANCE'];
  if (!allowed.includes(status))
    return res.status(400).json({ error: 'Invalid status value' });

  try {
    await db.query('UPDATE parking_slots SET status=? WHERE id=?', [status, req.params.id]);
    res.json({ message: 'Slot updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/admin/slots ─────────────────────────────────────
router.post('/slots', verifyToken, requireAdmin, async (req, res) => {
  const { lotId, slotNumber, slotType } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO parking_slots (lot_id, slot_number, slot_type) VALUES (?,?,?)',
      [lotId, slotNumber, slotType || 'STANDARD']
    );
    res.status(201).json({ message: 'Slot added', slotId: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /api/admin/slots/:id ───────────────────────────────
router.delete('/slots/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM parking_slots WHERE id=?', [req.params.id]);
    res.json({ message: 'Slot deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PATCH /api/admin/payments/:id ────────────────────────────
router.patch('/payments/:id', verifyToken, requireAdmin, async (req, res) => {
  const { status } = req.body;
  try {
    await db.query('UPDATE payments SET payment_status=? WHERE id=?', [status, req.params.id]);
    res.json({ message: 'Payment updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
