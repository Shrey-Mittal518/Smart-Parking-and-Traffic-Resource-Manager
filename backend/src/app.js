const express = require('express');
const cors    = require('cors');

const slotRoutes      = require('./routes/slotRoutes');
const sessionRoutes   = require('./routes/sessionRoutes');
const authRoutes      = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const { requireAuth } = require('./middleware/auth');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SPTRM backend is running',
    storage: 'mysql + in-memory slots',
  });
});

// Public auth routes
app.use('/api/auth', authRoutes);

// Protected API routes — require a valid JWT
app.use('/api/slots',     requireAuth, slotRoutes);
app.use('/api/sessions',  requireAuth, sessionRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.status === 400 ? 'Invalid JSON request body.' : 'Internal server error.',
  });
});

module.exports = app;
