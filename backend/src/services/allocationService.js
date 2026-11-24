const { slots } = require('../data/store');
const { Semaphore } = require('./syncPrimitives');
const rag = require('./resourceAllocationGraph');

const slotSemaphores = new Map(
  slots.map((slot) => [slot.id, new Semaphore(slot.status === 'free' ? 1 : 0)]),
);

for (const slot of slots) {
  if (slot.status !== 'occupied') continue;
  const ownerId = `initial:${slot.id}`;
  rag.registerRequest(ownerId, 'normal');
  rag.acquireResource(ownerId, slot.id);
}

function allocateSlot(category) {
  const slot = slots.find(
    (item) =>
      item.type === category &&
      item.status === 'free' &&
      slotSemaphores.get(item.id)?.tryAcquire(),
  );
  if (!slot) return null;

  slot.status = 'occupied';
  return slot;
}

function releaseSlot(slotId, sessionId) {
  const slot = slots.find((item) => item.id === slotId);
  if (!slot || slot.status !== 'occupied') return false;

  if (sessionId != null && Number(slot.car) !== Number(sessionId)) return false;

  slotSemaphores.get(slot.id).release();
  slot.status = 'free';
  slot.car = 0;
  return true;
}

module.exports = { allocateSlot, releaseSlot };