
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

  acquireResource(p, r) {
    const res = this._ensureResource(r);
    res.holder = p;
    res.waiters.delete(p); 
    let proc = this.processes.get(p);
    if (!proc) {
      // Defensive auto-register so the graph is never left inconsistent.
      proc = { id: p, priority: 'normal', holds: new Set(), waitsFor: null };
      this.processes.set(p, proc);
    }
    proc.holds.add(r);
    if (proc.waitsFor === r) proc.waitsFor = null;
  }
  
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
  addWaitEdge(p, r) {
    const proc = this.processes.get(p);
    if (!proc) return null;
    if (proc.waitsFor === r) return null; 

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
