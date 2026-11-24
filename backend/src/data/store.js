const BLOCKS = ['A', 'B', 'C', 'D'];
const BAYS_PER_ROW = 10;
const ROWS_PER_BLOCK = 3;
const { Mutex } = require('../services/syncPrimitives');

const RATES = {
  normal: 40,
  ev: 60,
  vip: 80,
  disabled: 20,
};

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function typeFor(block, n) {
  if (block === 'A' && n <= 5) return 'vip';
  if (block === 'C' && n <= 10) return 'ev';
  if (block === 'D' && n <= 5) return 'disabled';
  return 'normal';
}

function buildBays() {
  const random = seeded(2610);
  const bays = [];

  for (const block of BLOCKS) {
    for (let n = 1; n <= BAYS_PER_ROW * ROWS_PER_BLOCK; n++) {
      const type = typeFor(block, n);
      const chance = { ev: 0.6, disabled: 0.4, vip: 0.8, normal: 0.7 }[type];

      bays.push({
        id: `${block}${String(n).padStart(2, '0')}`,
        block,
        n,
        row: Math.ceil(n / BAYS_PER_ROW),
        type,
        status: random() < chance ? 'occupied' : 'free',
        car: 0,
      });
    }
  }

  return bays;
}

const slots = buildBays();
const bookings = [];
const vehicles = [];
const sessions = [];
const pendingRequests = [];

let nextSessionId = 1;
let nextRequestId = 1;


const allocationMutex = new Mutex();

function withAllocationLock(task) {
  return allocationMutex.runExclusive(task);
}

module.exports = {
  BLOCKS,
  BAYS_PER_ROW,
  ROWS_PER_BLOCK,
  RATES,
  slots,
  bookings,
  vehicles,
  sessions,
  pendingRequests,
  withAllocationLock,
  getNextSessionId: () => nextSessionId++,
  getNextRequestId: () => nextRequestId++,
};