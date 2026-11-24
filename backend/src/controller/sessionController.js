const {
  slots,
  sessions,
  pendingRequests,
  withAllocationLock,
  getNextSessionId,
  getNextRequestId,
  RATES,
} = require("../data/store");

const { scheduleRequests } = require("../services/schedulerService");
const { allocateSlot, releaseSlot } = require("../services/allocationService");
const rag = require("../services/resourceAllocationGraph");
const db = require("../services/dbService");

const VALID_CATEGORIES = ["normal", "ev", "vip", "disabled"];
const VALID_PRIORITIES = ["normal", "high", "emergency"];
const BASE_FEE = 20;

function normalizeVehicle(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

// ─── Core scheduler (runs inside the allocation lock) ────────────────────────

async function processPendingRequests() {
  if (!pendingRequests.length) return [];

  const scheduled = scheduleRequests(pendingRequests);
  const allocated = [];

  for (const request of scheduled) {
    rag.registerRequest(request.id, request.priority);
    const slot = allocateSlot(request.category);
    if (!slot) {
      const blockingSlot = slots.find(
        (item) => item.type === request.category && item.status === "occupied",
      );
      if (blockingSlot) {
        const cycle = rag.addWaitEdge(request.id, blockingSlot.id);
        if (cycle) resolveDeadlock(cycle);
      }
      continue;
    }

    rag.clearWaitEdge(request.id);
    rag.acquireResource(request.id, slot.id);

    const queueIndex = pendingRequests.findIndex(
      (item) => item.id === request.id,
    );
    if (queueIndex !== -1) pendingRequests.splice(queueIndex, 1);

    const session = {
      id: getNextSessionId(),
      requestId: request.id,
      vehicleNumber: request.vehicleNumber,
      category: request.category,
      priority: request.priority,
      slotId: slot.id,
      arrivalTime: request.arrivalTime,
      exitTime: null,
      durationHours: null,
      hourlyRate: RATES[request.category],
      fee: null,
      status: "active",
      paymentStatus: "unpaid",
      createdAt: new Date().toISOString(),
      bookingId: null, // filled by DB insert below
    };

    sessions.push(session);
    slot.car = session.id;
    allocated.push(session);

    // ── Persist to MySQL (non-blocking; errors are logged, not thrown) ──
    (async () => {
      try {
        // Resolve user_id from JWT payload if available (stored on the request obj)
        const userId = request._userId || null;

        const vehicleId = await db.upsertVehicle(
          request.vehicleNumber,
          userId,
          request.ownerName,
          request.vehicleName,
        );

        const bookingId = await db.insertBooking({
          vehicleId,
          slotNumber: slot.id,
          arrivalTime: request.arrivalTime,
          category: request.category,
          hourlyRate: RATES[request.category],
          userId,
        });

        session.bookingId = bookingId;
      } catch (err) {
        console.error(
          "[DB] Failed to persist booking for session",
          session.id,
          err.message,
        );
      }
    })();
  }

  return allocated;
}

function resolveDeadlock(cycle) {
  const graphProcesses = rag.getSnapshot().processes;
  const priorityRank = { normal: 1, high: 2, emergency: 3 };
  const victim = cycle.processes
    .map((id) => graphProcesses.find((process) => process.id === id))
    .filter(
      (process) =>
        process &&
        process.holds.length > 0 &&
        sessions.some((session) => session.requestId === process.id),
    )
    .sort(
      (a, b) =>
        (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1) ||
        Number(b.id) - Number(a.id),
    )[0];

  if (!victim) {
    console.error("[RAG] Deadlock detected without a releasable booking:", cycle);
    return;
  }

  const session = sessions.find((item) => item.requestId === victim.id);
  const { entry, freedResources } = rag.resolveDeadlock(cycle, victim.id);
  for (const resourceId of freedResources) {
    if (!releaseSlot(resourceId, session.id)) {
      throw new Error(`Could not release deadlock victim resource ${resourceId}`);
    }
  }
  session.status = "cancelled";
  session.cancelledAt = new Date().toISOString();
  if (session.bookingId) {
    db.updateBookingCancelled(session.bookingId, session.slotId).catch((err) =>
      console.error("[DB] Failed to persist deadlock rollback:", err.message),
    );
  }
  const pendingIndex = pendingRequests.findIndex((item) => item.id === victim.id);
  if (pendingIndex !== -1) pendingRequests.splice(pendingIndex, 1);
  console.error("[RAG] Deadlock resolved by rolling back booking:", entry);
}

// ─── Route handlers ───────────────────────────────────────────────────────────

function createSession(req, res) {
  const {
    vehicleNumber,
    ownerName,
    vehicleName,
    category,
    arrivalTime,
    priority = "normal",
  } = req.body || {};
  const normalizedVehicle = normalizeVehicle(vehicleNumber);

  if (
    !normalizedVehicle ||
    !ownerName?.trim() ||
    !vehicleName?.trim() ||
    !category
  ) {
    return res.status(400).json({
      success: false,
      message: "vehicleNumber, ownerName, vehicleName, and category are required.",
    });
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({
      success: false,
      message: `category must be one of: ${VALID_CATEGORIES.join(", ")}.`,
    });
  }

  if (!VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({
      success: false,
      message: `priority must be one of: ${VALID_PRIORITIES.join(", ")}.`,
    });
  }

  const hasActiveSession = sessions.some(
    (s) =>
      normalizeVehicle(s.vehicleNumber) === normalizedVehicle &&
      ["active", "awaiting_payment"].includes(s.status),
  );
  const hasPendingRequest = pendingRequests.some(
    (r) => normalizeVehicle(r.vehicleNumber) === normalizedVehicle,
  );

  if (hasActiveSession || hasPendingRequest) {
    return res.status(409).json({
      success: false,
      message:
        "This vehicle already has an active booking or a request waiting for allocation.",
    });
  }

  const request = {
    id: getNextRequestId(),
    vehicleNumber: normalizedVehicle,
    ownerName: ownerName.trim(),
    vehicleName: vehicleName.trim(),
    category,
    arrivalTime: new Date().toISOString(),
    priority,
    createdAt: new Date().toISOString(),
    _userId: req.user?.id || null,
  };

  pendingRequests.push(request);

  withAllocationLock(async () => {
    await processPendingRequests();
  }).catch((err) => console.error("Session allocation failed:", err));

  return res.status(202).json({
    success: true,
    message: "Booking request received. Allocation is processing.",
    request,
  });
}

function getSessions(req, res) {
  res.json({
    success: true,
    count: sessions.length,
    sessions: [...sessions].sort((a, b) => b.id - a.id),
    pendingRequests: [...pendingRequests].sort((a, b) => b.id - a.id),
  });
}

function getPendingRequests(req, res) {
  res.json({ success: true, count: pendingRequests.length, pendingRequests });
}

function getResourceAllocationGraph(req, res) {
  res.json({ success: true, data: rag.getSnapshot() });
}

function getDeadlockLog(req, res) {
  const deadlocks = rag.getDeadlockLog();
  res.json({ success: true, count: deadlocks.length, deadlocks });
}

async function cancelSession(req, res) {
  const sessionId = Number(req.params.id);
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid session ID." });
  }

  try {
    const result = await withAllocationLock(async () => {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session)
        return {
          status: 404,
          body: { success: false, message: "Session not found." },
        };
      if (session.status !== "active") {
        return {
          status: 400,
          body: {
            success: false,
            message: "Only active sessions can be cancelled.",
          },
        };
      }

      const released = releaseSlot(session.slotId, session.id);
      if (!released) {
        return {
          status: 409,
          body: {
            success: false,
            message: "The assigned bay could not be safely released.",
          },
        };
      }

      rag.releaseResource(session.requestId, session.slotId);
      rag.forgetRequest(session.requestId);
      session.status = "cancelled";
      session.cancelledAt = new Date().toISOString();

      // Persist cancellation
      if (session.bookingId) {
        db.updateBookingCancelled(session.bookingId, session.slotId).catch(
          (err) =>
            console.error(
              "[DB] Failed to mark booking cancelled:",
              err.message,
            ),
        );
      }

      await processPendingRequests();
      return {
        status: 200,
        body: {
          success: true,
          message: "Booking cancelled and bay released.",
          session,
        },
      };
    });

    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error("Cancellation failed:", err);
    return res
      .status(500)
      .json({ success: false, message: "Could not cancel this booking." });
  }
}

async function cancelPendingRequest(req, res) {
  const requestId = Number(req.params.id);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid request ID." });
  }

  const result = await withAllocationLock(async () => {
    const index = pendingRequests.findIndex((r) => r.id === requestId);
    if (index === -1) {
      return {
        status: 404,
        body: { success: false, message: "Pending request not found." },
      };
    }
    const [request] = pendingRequests.splice(index, 1);
    rag.clearWaitEdge(request.id);
    rag.forgetRequest(request.id);
    return {
      status: 200,
      body: { success: true, message: "Pending request cancelled.", request },
    };
  });

  return res.status(result.status).json(result.body);
}

function recordExit(req, res) {
  const sessionId = Number(req.params.id);
  const session = sessions.find((s) => s.id === sessionId);

  if (!session)
    return res
      .status(404)
      .json({ success: false, message: "Session not found." });
  if (session.status !== "active") {
    return res.status(400).json({
      success: false,
      message: "Only active sessions can record an exit.",
    });
  }

  const exitTime = new Date();
  const arrivalTime = new Date(session.arrivalTime);

  if (Number.isNaN(exitTime.getTime()) || exitTime <= arrivalTime) {
    return res.status(400).json({
      success: false,
      message: "Exit time must be valid and later than arrival time.",
    });
  }

  const durationHours = Math.max(
    1,
    Math.ceil((exitTime.getTime() - arrivalTime.getTime()) / 3600000),
  );

  session.exitTime = exitTime.toISOString();
  session.durationHours = durationHours;
  session.fee = BASE_FEE + durationHours * session.hourlyRate;
  session.status = "awaiting_payment";

  // Persist exit to MySQL
  if (session.bookingId) {
    db.updateBookingExit({
      bookingId: session.bookingId,
      exitTime: session.exitTime,
      durationHours,
      fee: session.fee,
    }).catch((err) =>
      console.error("[DB] Failed to update exit:", err.message),
    );
  }

  return res.json({
    success: true,
    message: "Exit recorded. Payment is now pending.",
    session,
  });
}

async function simulatePayment(req, res) {
  const sessionId = Number(req.params.id);

  try {
    const result = await withAllocationLock(async () => {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session)
        return {
          status: 404,
          body: { success: false, message: "Session not found." },
        };
      if (session.status !== "awaiting_payment") {
        return {
          status: 400,
          body: {
            success: false,
            message: "Record the vehicle exit before payment.",
          },
        };
      }
      if (session.paymentStatus === "paid") {
        return {
          status: 400,
          body: {
            success: false,
            message: "Payment has already been completed.",
          },
        };
      }

      const slot = slots.find((s) => s.id === session.slotId);
      if (!slot || Number(slot.car) !== Number(session.id)) {
        return {
          status: 409,
          body: {
            success: false,
            message: "The assigned bay could not be safely released.",
          },
        };
      }

      session.paymentStatus = "paid";
      session.status = "completed";
      session.paidAt = new Date().toISOString();
      releaseSlot(session.slotId, session.id);
      rag.releaseResource(session.requestId, session.slotId);
      rag.forgetRequest(session.requestId);
      await processPendingRequests();

      // Persist payment + mark booking completed
      if (session.bookingId) {
        db.insertTransaction(session.bookingId, session.fee).catch((err) =>
          console.error("[DB] Failed to insert transaction:", err.message),
        );
        db.updateBookingCompleted(session.bookingId, session.slotId).catch(
          (err) =>
            console.error("[DB] Failed to complete booking:", err.message),
        );
      }

      return {
        status: 200,
        body: {
          success: true,
          message: "Simulated payment successful. Parking bay is now free.",
          session,
          slot,
        },
      };
    });

    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error("Payment failed:", err);
    return res.status(500).json({
      success: false,
      message: "Could not complete simulated payment.",
    });
  }
}

module.exports = {
  createSession,
  getSessions,
  getPendingRequests,
  getResourceAllocationGraph,
  getDeadlockLog,
  cancelSession,
  cancelPendingRequest,
  recordExit,
  simulatePayment,
};
