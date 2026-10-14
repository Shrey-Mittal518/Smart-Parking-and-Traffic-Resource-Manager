// ============================================================
// SPTRM – OS Engine
// Implements: Mutex, Semaphore, FCFS, Priority Scheduling,
//             Round Robin, Resource Allocation Graph (Deadlock)
// ============================================================

// ─────────────────────────────────────────────────────────────
// MUTEX  (binary lock – critical section guard)
// ─────────────────────────────────────────────────────────────
class Mutex {
  constructor() {
    this.locked = false;
    this.waitingQueue = [];
  }

  acquire() {
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve();
      } else {
        this.waitingQueue.push(resolve);
      }
    });
  }

  release() {
    if (this.waitingQueue.length > 0) {
      const next = this.waitingQueue.shift();
      next();
    } else {
      this.locked = false;
    }
  }
}

// ─────────────────────────────────────────────────────────────
// COUNTING SEMAPHORE
// ─────────────────────────────────────────────────────────────
class Semaphore {
  constructor(count) {
    this.count = count;        // number of concurrent permits
    this.waitingQueue = [];
  }

  wait() {
    return new Promise((resolve) => {
      if (this.count > 0) {
        this.count--;
        resolve();
      } else {
        this.waitingQueue.push(resolve);
      }
    });
  }

  signal() {
    if (this.waitingQueue.length > 0) {
      const next = this.waitingQueue.shift();
      next();
    } else {
      this.count++;
    }
  }
}

// ─────────────────────────────────────────────────────────────
// SLOT LOCK MANAGER  (per-slot mutex map)
// ─────────────────────────────────────────────────────────────
class SlotLockManager {
  constructor() {
    this.locks = new Map();
  }

  getLock(slotId) {
    if (!this.locks.has(slotId)) {
      this.locks.set(slotId, new Mutex());
    }
    return this.locks.get(slotId);
  }
}

// ─────────────────────────────────────────────────────────────
// PROCESS / REQUEST  (parking request = OS process)
// ─────────────────────────────────────────────────────────────
class ParkingProcess {
  constructor({ id, userId, slotId, chargerId, vehicleType, arrivalTime }) {
    this.id          = id;
    this.userId      = userId;
    this.slotId      = slotId;
    this.chargerId   = chargerId || null;
    this.vehicleType = vehicleType || 'CAR';
    this.arrivalTime = arrivalTime || Date.now();

    // priority: lower number = higher urgency
    this.priority = { EMERGENCY: 1, EV: 3, CAR: 5, BIKE: 7 }[vehicleType] || 5;

    // burst time (ms) – simulated processing time
    this.burstTime   = this.priority === 1 ? 500 : 1000;

    // OS state machine
    this.state       = 'NEW';   // NEW → READY → RUNNING → COMPLETED
    this.startTime   = null;
    this.finishTime  = null;
  }

  get waitingTime()   { return this.startTime  ? this.startTime  - this.arrivalTime : 0; }
  get turnaroundTime(){ return this.finishTime ? this.finishTime - this.arrivalTime : 0; }
}

// ─────────────────────────────────────────────────────────────
// SCHEDULER
// ─────────────────────────────────────────────────────────────
class Scheduler {

  // ── FCFS ────────────────────────────────────────────────────
  fcfs(processes) {
    const queue = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
    let clock = Date.now();

    queue.forEach((p) => {
      p.state     = 'RUNNING';
      p.startTime = clock;
      clock      += p.burstTime;
      p.finishTime = clock;
      p.state     = 'COMPLETED';
    });

    return this._metrics('FCFS', queue);
  }

  // ── Priority Scheduling (non-preemptive, lower = higher) ────
  priority(processes) {
    const queue = [...processes].sort((a, b) =>
      a.priority !== b.priority ? a.priority - b.priority : a.arrivalTime - b.arrivalTime
    );
    let clock = Date.now();

    queue.forEach((p) => {
      p.state      = 'RUNNING';
      p.startTime  = clock;
      clock       += p.burstTime;
      p.finishTime = clock;
      p.state      = 'COMPLETED';
    });

    return this._metrics('PRIORITY', queue);
  }

  // ── Round Robin ─────────────────────────────────────────────
  roundRobin(processes, quantum = 800) {
    const queue     = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
    const remaining = queue.map((p) => ({ ...p, rem: p.burstTime }));
    let clock       = Date.now();
    const order     = [];

    let maxIter = remaining.length * 20; // safety guard
    while (remaining.some((p) => p.rem > 0) && maxIter-- > 0) {
      remaining.forEach((p) => {
        if (p.rem <= 0) return;
        if (!p.startTime) p.startTime = clock;
        const slice   = Math.min(quantum, p.rem);
        clock        += slice;
        p.rem        -= slice;
        if (p.rem <= 0) {
          p.finishTime = clock;
          p.state      = 'COMPLETED';
          order.push(p);
        }
      });
    }

    // copy computed times back to original process objects
    queue.forEach((orig) => {
      const r = remaining.find((x) => x.id === orig.id);
      if (r) {
        orig.startTime  = r.startTime;
        orig.finishTime = r.finishTime;
        orig.state      = r.state;
      }
    });

    return this._metrics('ROUND_ROBIN', queue);
  }

  // ── Helper: build metric summary ────────────────────────────
  _metrics(algo, queue) {
    const completed = queue.filter((p) => p.finishTime);
    const avgWait   = completed.reduce((s, p) => s + (p.startTime - p.arrivalTime), 0) / (completed.length || 1);
    const avgTAT    = completed.reduce((s, p) => s + (p.finishTime - p.arrivalTime), 0) / (completed.length || 1);

    return {
      algorithm : algo,
      order     : completed.map((p) => ({
        id          : p.id,
        priority    : p.priority,
        vehicleType : p.vehicleType,
        waitingMs   : Math.round(p.startTime - p.arrivalTime),
        turnaroundMs: Math.round(p.finishTime - p.arrivalTime),
        state       : p.state,
      })),
      summary: {
        totalJobs      : completed.length,
        avgWaitingMs   : Math.round(avgWait),
        avgTurnaroundMs: Math.round(avgTAT),
      },
    };
  }
}

// ─────────────────────────────────────────────────────────────
// RESOURCE ALLOCATION GRAPH  (Deadlock Detection)
// ─────────────────────────────────────────────────────────────
class ResourceAllocationGraph {
  constructor() {
    // assignment[pid] = [ { type, id } ]   — resources held by process
    this.assignments = new Map();
    // requests[pid]  = [ { type, id } ]   — resources requested by process
    this.requests    = new Map();
  }

  assign(pid, resourceType, resourceId) {
    if (!this.assignments.has(pid)) this.assignments.set(pid, []);
    this.assignments.get(pid).push({ type: resourceType, id: resourceId });
  }

  request(pid, resourceType, resourceId) {
    if (!this.requests.has(pid)) this.requests.set(pid, []);
    this.requests.get(pid).push({ type: resourceType, id: resourceId });
  }

  release(pid) {
    this.assignments.delete(pid);
    this.requests.delete(pid);
  }

  // ── Cycle detection (DFS) ────────────────────────────────────
  // Build wait-for graph: A waits for B if A requests a resource held by B
  detectDeadlock() {
    const waitFor = new Map();   // pid → [pids it's waiting for]
    const pids    = new Set([...this.assignments.keys(), ...this.requests.keys()]);

    pids.forEach((pid) => {
      waitFor.set(pid, []);
      const reqs = this.requests.get(pid) || [];
      reqs.forEach(({ type, id }) => {
        // find who holds this resource
        this.assignments.forEach((held, holder) => {
          if (holder !== pid) {
            const holdsThis = held.some((r) => r.type === type && r.id === id);
            if (holdsThis) waitFor.get(pid).push(holder);
          }
        });
      });
    });

    // DFS cycle check
    const visited   = new Set();
    const inStack   = new Set();
    let   deadlockCycle = null;

    const dfs = (node, path) => {
      if (inStack.has(node)) {
        deadlockCycle = path.slice(path.indexOf(node));
        return true;
      }
      if (visited.has(node)) return false;
      visited.add(node);
      inStack.add(node);
      path.push(node);

      for (const neighbour of (waitFor.get(node) || [])) {
        if (dfs(neighbour, path)) return true;
      }

      path.pop();
      inStack.delete(node);
      return false;
    };

    for (const pid of pids) {
      if (!visited.has(pid)) {
        if (dfs(pid, [])) break;
      }
    }

    return {
      deadlockDetected: !!deadlockCycle,
      cycle           : deadlockCycle || [],
      edges           : this._edgeList(),
    };
  }

  // ── Resolve: forcibly release one process in the cycle ───────
  resolve(cycleProcessIds) {
    if (!cycleProcessIds || cycleProcessIds.length === 0) return null;
    // Preempt the lowest-priority (highest number) process
    const victim = cycleProcessIds[cycleProcessIds.length - 1];
    this.release(victim);
    return victim;
  }

  _edgeList() {
    const edges = [];
    this.assignments.forEach((resources, pid) => {
      resources.forEach((r) => edges.push({ from: `R_${r.type}_${r.id}`, to: `P_${pid}`, type: 'ASSIGNMENT' }));
    });
    this.requests.forEach((resources, pid) => {
      resources.forEach((r) => edges.push({ from: `P_${pid}`, to: `R_${r.type}_${r.id}`, type: 'REQUEST' }));
    });
    return edges;
  }

  snapshot() {
    return {
      assignments: Object.fromEntries(this.assignments),
      requests   : Object.fromEntries(this.requests),
      ...this.detectDeadlock(),
    };
  }
}

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────
module.exports = {
  Mutex,
  Semaphore,
  ParkingProcess,
  Scheduler,
  ResourceAllocationGraph,
  slotLockManager: new SlotLockManager(),
  rag             : new ResourceAllocationGraph(),
};
