/**
 * dbService.js
 * All MySQL persistence for bookings, vehicles, transactions, and slot status.
 * The in-memory store is still the authoritative source for real-time slot
 * locking / scheduling; MySQL is the durable record of everything that happens.
 */

const { getPool } = require('../config/db');

// ─── Slot & Block seeding ────────────────────────────────────────────────────

/**
 * Called once at startup.
 * Populates parking_blocks and parking_slots from the in-memory bay list
 * if those tables are still empty.
 */
async function seedSlotsIfEmpty(slots) {
  const db = getPool();

  const [[{ cnt }]] = await db.execute('SELECT COUNT(*) AS cnt FROM parking_blocks');
  if (Number(cnt) > 0) return; // already seeded

  console.log('[DB] Seeding parking_blocks and parking_slots…');

  const BLOCKS    = ['A', 'B', 'C', 'D'];
  const RATES     = { normal: 40, ev: 60, vip: 80, disabled: 20 };
  const blockIdOf = {};

  for (const block of BLOCKS) {
    const capacity = slots.filter(s => s.block === block).length;
    const [res] = await db.execute(
      'INSERT INTO parking_blocks (block_name, total_capacity) VALUES (?, ?)',
      [block, capacity]
    );
    blockIdOf[block] = res.insertId;
  }

  for (const slot of slots) {
    await db.execute(
      `INSERT INTO parking_slots (block_id, slot_number, slot_type, status, hourly_rate)
       VALUES (?, ?, ?, ?, ?)`,
      [
        blockIdOf[slot.block],
        slot.id,          // e.g. "A01"
        slot.type,        // normal / ev / vip / disabled
        slot.status,      // free / occupied
        RATES[slot.type],
      ]
    );
  }

  console.log(`[DB] Seeded ${BLOCKS.length} blocks and ${slots.length} slots.`);
}

// ─── Slot status sync ────────────────────────────────────────────────────────

async function setSlotStatus(slotNumber, status) {
  const db = getPool();
  await db.execute(
    'UPDATE parking_slots SET status = ? WHERE slot_number = ?',
    [status, slotNumber]
  );
}

// ─── Vehicle upsert ──────────────────────────────────────────────────────────

/**
 * Returns the vehicle_id for a given licence plate, creating a row if needed.
 * userId may be null for anonymous / demo bookings.
 */

async function upsertVehicle(
  licensePlate,
  userId,
  ownerName,
  vehicleName
) {
  const db = getPool();

  const [rows] = await db.execute(
    `SELECT vehicle_id, user_id
     FROM vehicles
     WHERE license_plate = ?`,
    [licensePlate]
  );

  if (rows.length > 0) {
    const existingVehicle = rows[0];

    // Prevent another user from claiming an existing vehicle.
    if (
      userId &&
      existingVehicle.user_id &&
      existingVehicle.user_id !== userId
    ) {
      throw new Error('This vehicle is already registered to another user.');
    }

    await db.execute(
      `UPDATE vehicles
       SET owner_name = ?, vehicle_name = ?
       WHERE vehicle_id = ?`,
      [ownerName, vehicleName, existingVehicle.vehicle_id]
    );

    return existingVehicle.vehicle_id;
  }

  const [result] = await db.execute(
    `INSERT INTO vehicles
      (user_id, license_plate, owner_name, vehicle_name)
     VALUES (?, ?, ?, ?)`,
    [userId, licensePlate, ownerName, vehicleName]
  );

  return result.insertId;
}


// ─── Booking lifecycle ───────────────────────────────────────────────────────

async function insertBooking({ vehicleId, slotNumber, arrivalTime, category, hourlyRate, userId = null }) {
  const db = getPool();

  // Resolve numeric slot_id from slot_number string (e.g. "A01")
  const [[slotRow]] = await db.execute(
    'SELECT slot_id FROM parking_slots WHERE slot_number = ?',
    [slotNumber]
  );
  const slotId = slotRow ? slotRow.slot_id : null;

  const bookingDate = new Date(arrivalTime).toISOString().slice(0, 10);

  const [res] = await db.execute(
    `INSERT INTO bookings
       (user_id, vehicle_id, slot_id, booking_date, entry_time, status)
     VALUES (?, ?, ?, ?, ?, 'active')`,
    [userId, vehicleId, slotId, bookingDate, new Date(arrivalTime)]
  );

  // Mark slot occupied
  await setSlotStatus(slotNumber, 'occupied');

  return res.insertId; // booking_id for future updates
}

async function updateBookingExit({ bookingId, exitTime, durationHours, fee }) {
  const db = getPool();
  await db.execute(
    `UPDATE bookings
        SET exit_time      = ?,
            duration_hours = ?,
            total_amount   = ?,
            status         = 'awaiting_payment'
      WHERE booking_id = ?`,
    [new Date(exitTime), durationHours, fee, bookingId]
  );
}

async function updateBookingCancelled(bookingId, slotNumber) {
  const db = getPool();
  await db.execute(
    "UPDATE bookings SET status = 'cancelled' WHERE booking_id = ?",
    [bookingId]
  );
  await setSlotStatus(slotNumber, 'free');
}

async function updateBookingCompleted(bookingId, slotNumber) {
  const db = getPool();
  await db.execute(
    "UPDATE bookings SET status = 'completed' WHERE booking_id = ?",
    [bookingId]
  );
  await setSlotStatus(slotNumber, 'free');
}

// ─── Transaction ─────────────────────────────────────────────────────────────

async function insertTransaction(bookingId, amount) {
  const db = getPool();
  await db.execute(
    `INSERT INTO transactions (booking_id, amount, payment_status)
     VALUES (?, ?, 'paid')`,
    [bookingId, amount]
  );
}

module.exports = {
  seedSlotsIfEmpty,
  upsertVehicle,
  insertBooking,
  updateBookingExit,
  updateBookingCancelled,
  updateBookingCompleted,
  insertTransaction,
  setSlotStatus,
};
