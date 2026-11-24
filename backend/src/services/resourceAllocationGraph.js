// resourceAllocationGraph.js
//
// In-memory Resource Allocation Graph (RAG) + wait-for graph cycle detection.
//
// Why a RAG (and not Banker's avoidance):
//   - The parking lot allocates a small number of discrete, single-instance
//     resources (parking bays + EV chargers) to booking requests (processes).
//   - Banker's algorithm needs a pre-declared MAX claim per process and a safe
//     sequence search; that does not match this app's request flow (a booking
//     asks for "an ev slot and a charger", not a numeric claim vector).
//   - Detection + resolution fits naturally: we build the RAG, derive a
//     wait-for graph among processes, run DFS cycle detection, and on a cycle
//     we pick a victim, release its held resources, and deny it (rollback).
//
// This module is deliberately DB-free: it only touches in-memory Maps.
// Booking and slot persistence stays in the controller, keeping this
// unit-testable without MySQL.
//
// Single-instance soundness: each process waits for at most ONE concrete
// resource instance at a time (waitsFor is a single id), so a wait-for edge
// P->Q always points at the one process that holds the resource P wants.
// That makes the simple DFS cycle detection sound. (EV_CHARGER_COUNT defaults
// to 1 to keep charger-waits concrete; >1 degrades to best-effort.)

// ─── Internal state ──────────────────────────────────────────────────────────
//
// processes:  Map<requestId, { id, priority, holds: Set<resourceId>,
//                             waitsFor: resourceId | null }>
// resources: Map<resourceId, { id, type: 'slot'|'charger',
//                              holder: requestId | null, waiters: Set<requestId> }>
//
// Edges are DERIVED (never stored), which keeps the graph consistent by
// construction:
//   assignment edge  R -> P  :  resources[r].holder === p
//   request edge     P -> R  :  processes[p].waitsFor === r
// The wait-for graph (process -> process) used for cycle detection is derived
// from the request edges: P waits for R held by Q  ==>  P -> Q.

class ResourceAllocationGraph {
  constructor() {
    this.processes = new Map();
    this.resources = new Map();
    this.deadlockLog = [];
  }

  reset() {
    this.processes.clear();
    this.resources.clear();
    this.deadlockLog = [];
  }

  // Idempotent: re-registering an existing request is a safe no-op.
  registerRequest(id, priority) {
    if (this.processes.has(id)) return;
    this.processes.set(id, {
      id,
      priority,
      holds: new Set(),
      waitsFor: null,
    });
  }

  // Remove a process and any waiter memberships it has. Held resources are the
  // caller's responsibility to release first (releaseResource); this just
  // clears any stale holder/waiter references so the graph stays clean.
  forgetRequest(id) {
    const proc = this.processes.get(id);
    if (!proc) return;
    for (const r of proc.holds) {
      const res = this.resources.get(r);
      if (res && res.holder === id) res.holder = null;
    }
    if (proc.waitsFor) {
      const res = this.resources.get(proc.waitsFor);
      if (res) res.waiters.delete(id);
    }
    this.processes.delete(id);
  }

  // Ensure a resource node exists; type is inferred from the id convention
  // ("CH*" -> charger, anything else -> slot).
  _ensureResource(r) {
    let res = this.resources.get(r);
    if (!res) {
      res = {
        id: r,
        type: String(r).startsWith('CH') ? 'charger' : 'slot',
        holder: null,
        waiters: new Set(),
      };
      this.resources.set(r, res);
    }
    return res;
  }

  // Record that process p now holds resource r (assignment edge R -> p).
  acquireResource(p, r) {
    const res = this._ensureResource(r);
    res.holder = p;
    res.waiters.delete(p); // p no longer waits for something it now holds
    let proc = this.processes.get(p);
    if (!proc) {
      // Defensive auto-register so the graph is never left inconsistent.
      proc = { id: p, priority: 'normal', holds: new Set(), waitsFor: null };
      this.processes.set(p, proc);
    }
    proc.holds.add(r);
    if (proc.waitsFor === r) proc.waitsFor = null;
  }

  // Release process p's hold on resource r. Clears the holder, drops r from
  // p's holds, clears waitsFor if it pointed at r. Returns the freed id, or
  // null if p did not hold r.
  releaseResource(p, r) {
    const res = this.resources.get(r);
    const proc = this.processes.get(p);
    if (!res || !proc) return null;
    if (res.holder !== p) return null;
    res.holder = null;
    res.waiters.delete(p);
    proc.holds.delete(r);
    if (proc.waitsFor === r) proc.waitsFor = null;
    return r;
  }

  // Record that process p is now waiting for resource r (request edge p -> r),
  // then immediately run cycle detection. Idempotent: re-adding the same edge
  // (waitsFor already === r) returns null and does not re-detect.
  // Returns the detected cycle object or null.
  addWaitEdge(p, r) {
    const proc = this.processes.get(p);
    if (!proc) return null;
    if (proc.waitsFor === r) return null; // idempotent re-add

    // Clear any previous (different) wait edge from this process first.
    if (proc.waitsFor) {
      const prev = this.resources.get(proc.waitsFor);
      if (prev) prev.waiters.delete(p);
    }
    proc.waitsFor = r;
    const res = this._ensureResource(r);
    res.waiters.add(p);
    return this.detectCycle();
  }

  // Clear process p's current wait edge (no longer waiting).
  clearWaitEdge(p) {
    const proc = this.processes.get(p);
    if (!proc || !proc.waitsFor) return;
    const res = this.resources.get(proc.waitsFor);
    if (res) res.waiters.delete(p);
    proc.waitsFor = null;
  }

  // Build the wait-for graph: Map<p, p[]>. For each process p waiting for r,
  // if r is held by q (and q !== p) there is an edge p -> q.
  buildWaitForGraph() {
    const graph = new Map();
    for (const [p, proc] of this.processes) {
      graph.set(p, []);
      if (proc.waitsFor) {
        const res = this.resources.get(proc.waitsFor);
        const q = res && res.holder;
        if (q && q !== p) graph.get(p).push(q);
      }
    }
    return graph;
  }

  // Iterative DFS with three-color marking. On the first back edge to a gray
  // (on-stack) node, extract the cycle and return { processes, resources }.
  // Returns null when the wait-for graph is acyclic.
  // Sound for single-instance resources because every wait edge targets one
  // concrete holder.
  detectCycle() {
    const graph = this.buildWaitForGraph();
    const WHITE = 0;
    const GRAY = 1;
    const BLACK = 2;
    const color = new Map();
    for (const n of this.processes.keys()) color.set(n, WHITE);

    for (const start of this.processes.keys()) {
      if (color.get(start) !== WHITE) continue;
      const stack = [{ node: start, i: 0 }];
      const path = [start]; // gray nodes in stack order
      color.set(start, GRAY);
      while (stack.length) {
        const frame = stack[stack.length - 1];
        const neighbors = graph.get(frame.node) || [];
        if (frame.i < neighbors.length) {
          const next = neighbors[frame.i++];
          const c = color.get(next);
          if (c === GRAY) {
            // Back edge -> cycle from next ... frame.node.
            const idx = path.indexOf(next);
            const cycleProcs = path.slice(idx);
            const cycleRes = cycleProcs
              .map((p) => this.processes.get(p).waitsFor)
              .filter(Boolean);
            return { processes: cycleProcs, resources: cycleRes };
          } else if (c === WHITE) {
            color.set(next, GRAY);
            stack.push({ node: next, i: 0 });
            path.push(next);
          }
          // BLACK: already fully explored, skip.
        } else {
          color.set(frame.node, BLACK);
          stack.pop();
          path.pop();
        }
      }
    }
    return null;
  }

  // Resolve a detected cycle by rolling back the victim: release every
  // resource it holds, clear its wait edge, forget it, and append an in-memory
  // log entry. Returns { entry, freedResources }. RAG-only — no DB writes.
  resolveDeadlock(cycle, victimRequestId) {
    const proc = this.processes.get(victimRequestId);
    const freedResources = [];
    if (proc) {
      for (const r of [...proc.holds]) {
        const freed = this.releaseResource(victimRequestId, r);
        if (freed) freedResources.push(freed);
      }
      this.clearWaitEdge(victimRequestId);
      this.forgetRequest(victimRequestId);
    }
    const entry = {
      detectedAt: new Date().toISOString(),
      victimRequestId,
      cycleProcesses: cycle.processes,
      cycleResources: cycle.resources,
      resolution: 'deny_and_rollback',
      details:
        'Deadlock cycle detected via wait-for graph DFS; victim rolled back ' +
        '(held resources released) to break the circular wait.',
    };
    this.deadlockLog.push(entry);
    return { entry, freedResources };
  }

  getDeadlockLog() {
    return this.deadlockLog;
  }

  getResources() {
    return this.resources;
  }

  // Serializable snapshot for the read-only inspection endpoints.
  getSnapshot() {
    const processes = [];
    const assignmentEdges = [];
    const requestEdges = [];
    for (const [id, proc] of this.processes) {
      processes.push({
        id,
        priority: proc.priority,
        holds: [...proc.holds],
        waitsFor: proc.waitsFor,
      });
      if (proc.waitsFor) {
        requestEdges.push({ process: id, resource: proc.waitsFor });
      }
    }
    const resources = [];
    for (const [id, res] of this.resources) {
      resources.push({
        id,
        type: res.type,
        holder: res.holder,
        waiters: [...res.waiters],
      });
      if (res.holder) {
        assignmentEdges.push({ resource: id, process: res.holder });
      }
    }
    const waitForGraph = {};
    for (const [p, targets] of this.buildWaitForGraph()) {
      waitForGraph[p] = targets;
    }
    return {
      processes,
      resources,
      assignmentEdges,
      requestEdges,
      waitForGraph,
      cycle: this.detectCycle(),
    };
  }
}

// Singleton — one graph shared across the allocation flow.
const rag = new ResourceAllocationGraph();

module.exports = rag;
