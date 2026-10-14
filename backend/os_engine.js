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
      const nextInLine = this.waitingQueue.shift();
      nextInLine();
    } else {
      this.locked = false;
    }
  }
}

// Global key-based mutex map for individual slots
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

module.exports = new SlotLockManager();