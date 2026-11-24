require('dotenv').config();

const app = require('./src/app');
const { initDb } = require('./src/config/db');
const { seedSlotsIfEmpty } = require('./src/services/dbService');
const { slots } = require('./src/data/store');

const PORT = process.env.PORT || 3000;

initDb()
  .then(() => seedSlotsIfEmpty(slots))
  .then(() => {
    app.listen(PORT, () => {
      console.log(`SPTRM backend is running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[FATAL] Startup failed:', err.message);
    process.exit(1);
  });
