// syncPrimitives.js
// Pure-JS synchronization primitives (no external deps, no Node globals, no DB).
// These model the textbook OS concepts the rest of the backend relies on:
//   - Mutex:     binary lock protecting an exclusive critical section (one owner).
//   - Semaphore: counting permit gate bounding a pool of N identical resources.
//
// Both are async-friendly (Promise-based) so they compose with the existing
// `async` allocation/session flow without blocking the Node event loop.

/**
 * Async Mutex — at most one critical section runs per instance at a time.
 *
 * Invariant: single-owner. acquire()/release() must pair; release() while
 * unlocked throws, so an over-release surfaces as a bug instead of silently
 * corrupting state. runExclusive() is the preferred entry point: it always
 * releases, even if the body throws.
 */
class Mutex {
  constructor() {
    this._locked = false;
    this._queue = []; // FIFO of { resolve } waiting for the lock
  }

  acquire() {
    if (!this._locked) {
      this._locked = true;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this._queue.push(resolve);
    });
  }

  release() {
    if (!this._locked) {
      throw new Error('Mutex.release() called on an unlocked mutex');
    }
    if (this._queue.length) {
      // Hand the lock straight to the next waiter (still "locked").
      this._queue.shift()();
    } else {
      this._locked = false;
    }
  }

  async runExclusive(fn) {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

/**
 * Counting Semaphore — bounds access to a pool of N identical resources.
 *
 * Invariant: when every acquire() is paired with a matching release(),
 * `available + in-use === initial permits`. tryAcquire() never blocks; it
 * returns false when permits are exhausted. release() over the initial count
 * throws to surface a release-without-acquire bug.
 */
class Semaphore {
  constructor(permits) {
    if (permits < 0) {
      throw new Error('Semaphore permits must be >= 0');
    }
    this._available = permits;
    this._initial = permits;
    this._waiters = []; // FIFO of { resolve } blocked in acquire()
  }

  // Non-blocking; returns true if a permit was taken, false if exhausted.
  tryAcquire() {
    if (this._available > 0) {
      this._available -= 1;
      return true;
    }
    return false;
  }

  // Blocking form (used by tests / explicit waits); resolves when a permit
  // becomes available.
  acquire() {
    if (this._available > 0) {
      this._available -= 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this._waiters.push(resolve);
    });
  }

  release() {
    if (this._waiters.length) {
      // Wake the next blocked acquire(); do not change _available.
      this._waiters.shift()();
    } else if (this._available < this._initial) {
      this._available += 1;
    } else {
      throw new Error('Semaphore.release() called more times than permits');
    }
  }

  availablePermits() {
    return this._available;
  }
}

module.exports = { Mutex, Semaphore };
