// ============================================================
// SPTRM – Express Server
// Entry point: authentication + all route mounts
// ============================================================
require('dotenv').config({ path: './file.env' });

const express = require('express');
const cors    = require('cors');

const authRoutes        = require('./routes/auth');
const parkingRoutes     = require('./routes/parking');
const reservationRoutes = require('./routes/reservations');
const schedulerRoutes   = require('./routes/scheduler');
const adminRoutes       = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Routes ──────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/parking',      parkingRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/scheduler',    schedulerRoutes);
app.use('/api/admin',        adminRoutes);

// ─── Health check ────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', project: 'SPTRM Phase-II', timestamp: new Date() });
});

// ─── Global error handler ────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[SPTRM ERROR]', err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║   SPTRM – Smart Parking & Traffic Resource Mgr  ║
║   Backend running on http://localhost:${PORT}      ║
║   Team Levengers | OS+DBMS 2026-27              ║
╚══════════════════════════════════════════════════╝
  `);
});

module.exports = app;
