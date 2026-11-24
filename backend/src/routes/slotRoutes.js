const express = require('express');
const router = express.Router();
const { slots, RATES } = require('../data/store');

router.get('/', (req, res) => {
  const { block, type, status } = req.query;
  let result = slots;

  if (block) result = result.filter((slot) => slot.block === String(block).toUpperCase());
  if (type) result = result.filter((slot) => slot.type === String(type).toLowerCase());
  if (status) result = result.filter((slot) => slot.status === String(status).toLowerCase());

  res.json({
    success: true,
    count: result.length,
    data: result.map((slot) => ({ ...slot, hourlyRate: RATES[slot.type] })),
  });
});

router.get('/:id', (req, res) => {
  const slot = slots.find((item) => item.id === String(req.params.id).toUpperCase());

  if (!slot) {
    return res.status(404).json({ success: false, message: 'Parking slot not found.' });
  }

  return res.json({
    success: true,
    data: { ...slot, hourlyRate: RATES[slot.type] },
  });
});

module.exports = router;