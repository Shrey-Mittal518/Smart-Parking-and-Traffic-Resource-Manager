const express = require('express');
const router  = express.Router();
const { slots, sessions, pendingRequests, RATES } = require('../data/store');

/**
 * GET /api/dashboard
 * Returns everything the Dashboard page needs in one call:
 *   - live slot stats (total / free / taken / by-type / by-block)
 *   - recent activity (last 12 events derived from real sessions)
 *   - gate traffic for today (entries/exits per hour, last 8 hours)
 */
router.get('/', (req, res) => {

  // ── 1. Slot stats ─────────────────────────────────────────────────────────
  const TYPE_KEYS = ['normal', 'ev', 'vip', 'disabled'];
  const BLOCKS    = ['A', 'B', 'C', 'D'];

  const slotStats = {
    total : slots.length,
    free  : slots.filter(s => s.status === 'free').length,
    taken : slots.filter(s => s.status === 'occupied').length,
    type  : Object.fromEntries(TYPE_KEYS.map(t => [t, {
      total : slots.filter(s => s.type === t).length,
      free  : slots.filter(s => s.type === t && s.status === 'free').length,
    }])),
    block : Object.fromEntries(BLOCKS.map(b => [b, {
      total : slots.filter(s => s.block === b).length,
      free  : slots.filter(s => s.block === b && s.status === 'free').length,
    }])),
  };

  // ── 2. Recent activity ────────────────────────────────────────────────────
  // Collect events from sessions and pending requests, newest first.
  const events = [];

  sessions.forEach(session => {
    // Booking created / slot allocated
    if (session.createdAt) {
      events.push({
        ts   : new Date(session.createdAt).getTime(),
        text : `${session.vehicleNumber} booked slot ${session.slotId || '(pending)'} (${session.category})`,
        kind : 'book',
      });
    }
    // Exit recorded
    if (session.exitTime) {
      events.push({
        ts   : new Date(session.exitTime).getTime(),
        text : `${session.vehicleNumber} exited from bay ${session.slotId}`,
        kind : 'out',
      });
    }
    // Payment completed
    if (session.paidAt) {
      events.push({
        ts   : new Date(session.paidAt).getTime(),
        text : `Payment ₹${session.fee} received for ${session.vehicleNumber} (bay ${session.slotId})`,
        kind : 'pay',
      });
    }
    // Cancelled
    if (session.cancelledAt) {
      events.push({
        ts   : new Date(session.cancelledAt).getTime(),
        text : `Booking for ${session.vehicleNumber} (bay ${session.slotId}) was cancelled`,
        kind : 'cancel',
      });
    }
  });

  pendingRequests.forEach(req => {
    if (req.createdAt) {
      events.push({
        ts   : new Date(req.createdAt).getTime(),
        text : `${req.vehicleNumber} is waiting for a ${req.category} slot (${req.priority} priority)`,
        kind : 'wait',
      });
    }
  });

  // Sort newest first, keep top 12
  events.sort((a, b) => b.ts - a.ts);
  const activity = events.slice(0, 12).map(e => ({
    time : new Date(e.ts).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }),
    text : e.text,
    kind : e.kind,
  }));

  // ── 3. Gate traffic (entries & exits per hour for the last 8 hours) ───────
  const now   = Date.now();
  const hours = 8;
  const labels  = [];
  const inCount  = [];
  const outCount = [];

  for (let i = hours - 1; i >= 0; i--) {
    const slotStart = now - (i + 1) * 3600000;
    const slotEnd   = now - i * 3600000;

    const d = new Date(slotEnd);
    labels.push(d.toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true }));

    inCount.push(
      sessions.filter(s => {
        const t = new Date(s.createdAt).getTime();
        return t >= slotStart && t < slotEnd;
      }).length
    );

    outCount.push(
      sessions.filter(s => {
        if (!s.exitTime) return false;
        const t = new Date(s.exitTime).getTime();
        return t >= slotStart && t < slotEnd;
      }).length
    );
  }

  res.json({
    success: true,
    slotStats,
    activity,
    gateTraffic: { labels, in: inCount, out: outCount },
  });
});

module.exports = router;
