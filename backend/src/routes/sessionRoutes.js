const express = require('express');

const {
  createSession,
  getSessions,
  getPendingRequests,
  getResourceAllocationGraph,
  getDeadlockLog,
  cancelSession,
  cancelPendingRequest,
  recordExit,
  simulatePayment,
} = require('../controller/sessionController');

const router = express.Router();

router.post('/', createSession);
router.get('/', getSessions);
router.get('/pending', getPendingRequests);
router.get('/resource-graph', getResourceAllocationGraph);
router.get('/deadlocks', getDeadlockLog);

router.delete('/requests/:id', cancelPendingRequest);
router.patch('/:id/exit', recordExit);
router.patch('/:id/payment', simulatePayment);
router.delete('/:id', cancelSession);

module.exports = router;