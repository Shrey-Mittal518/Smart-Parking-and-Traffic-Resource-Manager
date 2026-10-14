// ============================================================
// SPTRM – Reservation Routes
// Uses sp_book_slot stored procedure + OS mutex critical section
// ============================================================
const express                      = require('express');
const db                           = require('../db');
const { verifyToken }              = require('../middleware/auth');
const { slotLockManager, rag }     = require('../os_engine');

const router = express.Router();

// ── POST /api/reservations/book ───────────────────────────────
// Books a slot via stored procedure (ACID transaction)
// Wraps with in-process mutex for the slot (OS critical section)
router.post('/book', verifyToken, async (req, res) => {
  const { slotId, chargerId, vehicleType, startTime, endTime } = req.body;
  const userId = req.user.id;

  if (!slotId || !startTime || !endTime)
    return res.status(400).json({ error: 'slotId, startTime, endTime required' });

  // Acquire per-slot mutex (OS critical section)
  const mutex = slotLockManager.getLock(slotId);
  await mutex.acquire();

  try {
    // Update RAG: process requests slot
    rag.request(userId, 'SLOT', slotId);
    if (chargerId) rag.request(userId, 'EV_CHARGER', chargerId);

    // Check for deadlock before proceeding
    const ragSnap = rag.detectDeadlock();
    if (ragSnap.deadlockDetected) {
      rag.release(userId);
      mutex.release();
      return res.status(409).json({
        error  : 'Deadlock detected – your request was rolled back to resolve it.',
        cycle  : ragSnap.cycle,
        ragEdges: ragSnap.edges,
      });
    }

    // Call stored procedure
    await db.query('SET @rid = 0; SET @msg = "";');
    await db.query(
      'CALL sp_book_slot(?, ?, ?, ?, ?, ?, @rid, @msg)',
      [userId, slotId, chargerId || null, vehicleType || 'CAR', startTime, endTime]
    );
    const [[out]] = await db.query('SELECT @rid AS reservationId, @msg AS message');

    if (out.reservationId === -1) {
      rag.release(userId);
      mutex.release();
      return res.status(409).json({ error: out.message });
    }

    // Update RAG: assign resources to process
    rag.release(userId);
    rag.assign(userId, 'SLOT', slotId);
    if (chargerId) rag.assign(userId, 'EV_CHARGER', chargerId);

    // Log to scheduler_log for performance tracking
    await db.query(
      `INSERT INTO scheduler_log (algorithm, reservation_id, arrival_time, start_time, finish_time)
       VALUES ('FCFS', ?, NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 1 SECOND))`,
      [out.reservationId]
    );

    res.status(201).json({ message: out.message, reservationId: out.reservationId });
  } catch (err) {
    rag.release(userId);
    res.status(500).json({ error: err.message });
  } finally {
    mutex.release();
  }
});

// ── POST /api/reservations/confirm/:id ────────────────────────
router.post('/confirm/:id', verifyToken, async (req, res) => {
  try {
    await db.query(
      "UPDATE reservations SET status='CONFIRMED' WHERE id=? AND user_id=?",
      [req.params.id, req.user.id]
    );
    // RAG: release resources (trigger handles DB side)
    rag.release(req.user.id);
    res.json({ message: 'Reservation confirmed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/reservations/cancel/:id ────────────────────────
router.post('/cancel/:id', verifyToken, async (req, res) => {
  try {
    await db.query('SET @msg = ""');
    await db.query('CALL sp_cancel_reservation(?, ?, @msg)', [req.params.id, req.user.id]);
    const [[out]] = await db.query('SELECT @msg AS message');
    rag.release(req.user.id);
    res.json({ message: out.message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/reservations/my ──────────────────────────────────
router.get('/my', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, ps.slot_number, ps.slot_type, pl.name AS lot_name
       FROM reservations r
       JOIN parking_slots ps ON ps.id = r.slot_id
       JOIN parking_lots  pl ON pl.id = ps.lot_id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/reservations/start-session ─────────────────────
router.post('/start-session', verifyToken, async (req, res) => {
  const { reservationId } = req.body;
  try {
    const [result] = await db.query(
      "INSERT INTO sessions (reservation_id) VALUES (?)",
      [reservationId]
    );
    res.json({ message: 'Session started', sessionId: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/reservations/end-session ───────────────────────
router.post('/end-session', verifyToken, async (req, res) => {
  try {
    await db.query('SET @msg = ""');
    await db.query('CALL sp_end_session(?, @msg)', [req.body.sessionId]);
    const [[out]] = await db.query('SELECT @msg AS message');
    res.json({ message: out.message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/reservations/active (admin / all users) ─────────
router.get('/active', verifyToken, async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM v_active_reservations');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
