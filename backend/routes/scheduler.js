// ============================================================
// SPTRM – Scheduler Routes
// Exposes FCFS, Priority, Round Robin, RAG/Deadlock endpoints
// ============================================================
const express                                          = require('express');
const db                                               = require('../db');
const { ParkingProcess, Scheduler, rag }               = require('../os_engine');
const { verifyToken }                                  = require('../middleware/auth');

const router    = express.Router();
const scheduler = new Scheduler();

// ─── Helper: load pending reservations as ParkingProcess objects ──
async function loadPendingProcesses() {
  const [rows] = await db.query(
    `SELECT r.id, r.user_id, r.slot_id, r.charger_id,
            r.vehicle_type, r.created_at AS arrival_time, r.priority
     FROM reservations r WHERE r.status = 'PENDING'
     ORDER BY r.created_at ASC`
  );
  return rows.map((r) => new ParkingProcess({
    id          : r.id,
    userId      : r.user_id,
    slotId      : r.slot_id,
    chargerId   : r.charger_id,
    vehicleType : r.vehicle_type,
    arrivalTime : new Date(r.arrival_time).getTime(),
  }));
}

// ── GET /api/scheduler/fcfs ───────────────────────────────────
router.get('/fcfs', verifyToken, async (_req, res) => {
  try {
    const procs  = await loadPendingProcesses();
    const result = scheduler.fcfs(procs);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/scheduler/priority ───────────────────────────────
router.get('/priority', verifyToken, async (_req, res) => {
  try {
    const procs  = await loadPendingProcesses();
    const result = scheduler.priority(procs);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/scheduler/round-robin ────────────────────────────
router.get('/round-robin', verifyToken, async (req, res) => {
  try {
    const quantum = parseInt(req.query.quantum) || 800;
    const procs   = await loadPendingProcesses();
    const result  = scheduler.roundRobin(procs, quantum);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/scheduler/compare ────────────────────────────────
// Run all three on the same queue and return a comparison
router.get('/compare', verifyToken, async (_req, res) => {
  try {
    const procs = await loadPendingProcesses();
    if (!procs.length)
      return res.json({ message: 'No pending requests to compare', results: [] });

    const fcfsResult  = scheduler.fcfs([...procs]);
    const prioResult  = scheduler.priority([...procs]);
    const rrResult    = scheduler.roundRobin([...procs]);

    // Also store in DB for persistent metrics
    const insertMetric = async (algo, summary) => {
      if (!procs.length) return;
      await db.query(
        `INSERT INTO scheduler_log (algorithm, reservation_id, arrival_time, start_time, finish_time)
         VALUES (?, ?, NOW(), NOW(), DATE_ADD(NOW(), INTERVAL ? SECOND))`,
        [algo, procs[0].id, Math.round(summary.avgTurnaroundMs / 1000)]
      ).catch(() => {});  // non-fatal
    };
    await insertMetric('FCFS', fcfsResult.summary);
    await insertMetric('PRIORITY', prioResult.summary);
    await insertMetric('ROUND_ROBIN', rrResult.summary);

    res.json({
      FCFS       : fcfsResult,
      PRIORITY   : prioResult,
      ROUND_ROBIN: rrResult,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/scheduler/performance ───────────────────────────
router.get('/performance', verifyToken, async (_req, res) => {
  try {
    const [rows] = await db.query('CALL sp_scheduling_report()');
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/scheduler/rag ───────────────────────────────────
// Current Resource Allocation Graph snapshot + deadlock detection
router.get('/rag', verifyToken, (_req, res) => {
  res.json(rag.snapshot());
});

// ── POST /api/scheduler/rag/simulate ─────────────────────────
// Simulate a deadlock scenario for demonstration
router.post('/rag/simulate', verifyToken, (_req, res) => {
  const tempRag = require('../os_engine').rag;

  // Process P1 holds SLOT-1, requests EV_CHARGER-1
  tempRag.assign(901, 'SLOT', 1);
  tempRag.request(901, 'EV_CHARGER', 1);

  // Process P2 holds EV_CHARGER-1, requests SLOT-1  → DEADLOCK
  tempRag.assign(902, 'EV_CHARGER', 1);
  tempRag.request(902, 'SLOT', 1);

  const result = tempRag.detectDeadlock();

  if (result.deadlockDetected) {
    const victim = tempRag.resolve(result.cycle);
    result.resolved = true;
    result.victimProcess = victim;
  }

  res.json(result);
});

module.exports = router;
