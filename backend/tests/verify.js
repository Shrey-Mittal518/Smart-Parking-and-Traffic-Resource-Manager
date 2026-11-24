// tests/verify.js
// Isolated, no-DB verification of the synchronization primitives, the RAG
// deadlock detector, and the (round-robin-free) scheduler. Plain `node` with
// asserts — exit 0 on success, throw on failure. Run with:
//   cd backend && node tests/verify.js
//
// These tests do NOT touch MySQL: they prove the pure-JS OS primitives and the
// deadlock detection/resolution logic in isolation, then act as a regression
// gate for the rest of the allocation flow.

const assert = require('assert');
const { Mutex, Semaphore } = require('../src/services/syncPrimitives');
const rag = require('../src/services/resourceAllocationGraph');
const {
  selectAlgorithm,
  scheduleRequests,
} = require('../src/services/schedulerService');

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function assertRaises(fn, msg) {
  let threw = false;
  try {
    fn();
  } catch (e) {
    threw = true;
  }
  assert(threw, msg);
}

async function testMutex() {
  // (a) Mutex prevents double-booking of a single slot.
  const reserve = async (slot, useMutex) => {
    const body = async () => {
      if (slot.status === 'free') {
        await delay(5); // simulate a little async work in the critical section
        slot.status = 'occupied';
        return { ok: true };
      }
      return { ok: false };
    };
    if (useMutex) {
      return slot._mutex.runExclusive(body);
    }
    return body(slot);
  };

  // Guarded: exactly one reservation wins; the slot ends occupied once.
  const guarded = { id: 'A01', status: 'free', car: 0, _mutex: new Mutex() };
  const gResults = await Promise.all([
    reserve(guarded, true),
    reserve(guarded, true),
  ]);
  assert.strictEqual(
    gResults.filter((r) => r.ok).length,
    1,
    'guarded: exactly one reservation should win',
  );
  assert.strictEqual(guarded.status, 'occupied');

  // Control: WITHOUT the mutex both reservations pass the free-check before
  // either commits, so both win — proving the mutex is what prevents it.
  const bare = { id: 'A01', status: 'free', car: 0 };
  const bResults = await Promise.all([reserve(bare, false), reserve(bare, false)]);
  assert.strictEqual(
    bResults.filter((r) => r.ok).length,
    2,
    'control: both should win without a mutex',
  );

  // runExclusive always releases, even on throw.
  const m = new Mutex();
  await assert.rejects(
    () => m.runExclusive(() => Promise.reject(new Error('boom'))),
    /boom/,
  );
  // Lock is free again afterwards (a new body can run).
  let ran = false;
  await m.runExclusive(() => {
    ran = true;
    return Promise.resolve('ok');
  });
  assert.strictEqual(ran, true);

  // release on an unlocked mutex throws.
  const m2 = new Mutex();
  assertRaises(() => m2.release(), 'release on unlocked mutex should throw');
}

function testSemaphore() {
  // (b) Counting semaphore bounds a pool of 2.
  const s = new Semaphore(2);
  assert.strictEqual(s.tryAcquire(), true);
  assert.strictEqual(s.tryAcquire(), true);
  assert.strictEqual(s.tryAcquire(), false); // exhausted
  assert.strictEqual(s.availablePermits(), 0);
  s.release();
  assert.strictEqual(s.tryAcquire(), true); // a released permit is reusable
  assert.strictEqual(s.availablePermits(), 0);

  // Over-release throws.
  const s2 = new Semaphore(1);
  s2.tryAcquire();
  s2.release();
  assertRaises(() => s2.release(), 'over-release should throw');

  // Negative permits rejected.
  assertRaises(() => new Semaphore(-1), 'negative permits should throw');
}

function testDeadlock() {
  // (c) Circular wait + resolution (design §13-2b).
  rag.reset();
  rag.registerRequest('A', 'normal');
  rag.registerRequest('B', 'normal');
  rag.acquireResource('A', 'C01'); // A holds EV slot C01
  rag.acquireResource('B', 'CH1'); // B holds charger CH1

  // A waits for the charger B holds -> no cycle yet.
  assert.strictEqual(rag.addWaitEdge('A', 'CH1'), null);

  // B waits for the slot A holds -> cycle closes.
  const cycle = rag.addWaitEdge('B', 'C01');
  assert.ok(cycle, 'a cycle should be detected on the closing edge');
  assert.ok(
    cycle.processes.includes('A') && cycle.processes.includes('B'),
    'cycle processes should include A and B',
  );
  assert.ok(
    cycle.resources.includes('C01') && cycle.resources.includes('CH1'),
    'cycle resources should include C01 and CH1',
  );

  // Resolve by rolling back the victim (B added the closing edge).
  const { freedResources } = rag.resolveDeadlock(cycle, 'B');
  assert.ok(
    freedResources.includes('CH1'),
    'the victim held charger CH1 should be freed',
  );
  assert.strictEqual(
    rag.getResources().get('CH1').holder,
    null,
    'freed charger should have no holder',
  );
  assert.strictEqual(
    rag.getDeadlockLog().length,
    1,
    'exactly one deadlock log entry',
  );

  // Idempotent re-add of the same wait edge returns null (no spurious cycle).
  rag.reset();
  rag.registerRequest('X', 'normal');
  rag.acquireResource('X', 'C01');
  assert.strictEqual(rag.addWaitEdge('X', 'C01'), null);
}

function testScheduler() {
  // (d) Round-robin is gone; FCFS and Priority behave.
  const reqs = [
    { priority: 'normal', createdAt: '2024-01-03' },
    { priority: 'high', createdAt: '2024-01-02' },
    { priority: 'emergency', createdAt: '2024-01-01' },
  ];

  assert.strictEqual(selectAlgorithm(reqs), 'priority'); // has an emergency
  assert.strictEqual(
    selectAlgorithm([{ priority: 'normal', createdAt: 'x' }]),
    'fcfs',
  );
  assert.notStrictEqual(selectAlgorithm(reqs), 'round-robin');

  // FCFS preserves arrival (push) order.
  const fcfs = scheduleRequests(reqs, 'fcfs');
  assert.deepStrictEqual(
    fcfs.map((r) => r.priority),
    ['normal', 'high', 'emergency'],
  );

  // Priority orders by rank then createdAt.
  const prio = scheduleRequests(reqs, 'priority');
  assert.deepStrictEqual(
    prio.map((r) => r.priority),
    ['emergency', 'high', 'normal'],
  );
}

(async () => {
  await testMutex();
  console.log('PASS mutex');
  testSemaphore();
  console.log('PASS semaphore');
  testDeadlock();
  console.log('PASS deadlock');
  testScheduler();
  console.log('PASS scheduler');
  process.exit(0);
})().catch((err) => {
  console.error('FAIL:', err && err.stack ? err.stack : err);
  process.exit(1);
});
