-- ============================================================
-- SPTRM - Smart Parking & Traffic Resource Manager
-- Database Schema | Academic Session 2026-27 | Team Levengers
-- ============================================================

CREATE DATABASE IF NOT EXISTS sptrm_db;
USE sptrm_db;

-- ─────────────────────────────────────────────────────────────
-- TABLES (3NF Normalised)
-- ─────────────────────────────────────────────────────────────

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(100)  NOT NULL,
    email          VARCHAR(120)  NOT NULL UNIQUE,
    password_hash  VARCHAR(255)  NOT NULL,
    role           ENUM('USER','ADMIN','EMERGENCY_SERVICE') DEFAULT 'USER',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    user_id        INT NOT NULL,
    license_plate  VARCHAR(20)  NOT NULL UNIQUE,
    vehicle_type   ENUM('CAR','BIKE','EV','EMERGENCY') DEFAULT 'CAR',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Parking Lots
CREATE TABLE IF NOT EXISTS parking_lots (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    total_slots  INT          NOT NULL DEFAULT 50,
    location     VARCHAR(255) NOT NULL
);

-- 4. Parking Slots
CREATE TABLE IF NOT EXISTS parking_slots (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    lot_id       INT NOT NULL,
    slot_number  VARCHAR(20)  NOT NULL,
    slot_type    ENUM('STANDARD','EV_CHARGING','EMERGENCY') DEFAULT 'STANDARD',
    status       ENUM('AVAILABLE','OCCUPIED','RESERVED','MAINTENANCE') DEFAULT 'AVAILABLE',
    FOREIGN KEY (lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE,
    UNIQUE KEY unique_lot_slot (lot_id, slot_number)
);

-- 5. EV Chargers  (finite resource for RAG/deadlock simulation)
CREATE TABLE IF NOT EXISTS ev_chargers (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    charger_code  VARCHAR(20) NOT NULL UNIQUE,
    status        ENUM('AVAILABLE','IN_USE') DEFAULT 'AVAILABLE'
);

-- 6. Reservations
CREATE TABLE IF NOT EXISTS reservations (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    slot_id     INT NOT NULL,
    charger_id  INT DEFAULT NULL,
    vehicle_type ENUM('CAR','BIKE','EV','EMERGENCY') DEFAULT 'CAR',
    priority    INT DEFAULT 5  COMMENT '1=highest (emergency), 10=lowest',
    status      ENUM('PENDING','CONFIRMED','CANCELLED','COMPLETED') DEFAULT 'PENDING',
    start_time  DATETIME NOT NULL,
    end_time    DATETIME NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)    REFERENCES users(id)         ON DELETE CASCADE,
    FOREIGN KEY (slot_id)    REFERENCES parking_slots(id) ON DELETE RESTRICT,
    FOREIGN KEY (charger_id) REFERENCES ev_chargers(id)   ON DELETE SET NULL
);

-- 7. Sessions (real-time entry / exit)
CREATE TABLE IF NOT EXISTS sessions (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id   INT NOT NULL,
    entry_time       DATETIME DEFAULT CURRENT_TIMESTAMP,
    exit_time        DATETIME DEFAULT NULL,
    session_status   ENUM('ACTIVE','ENDED') DEFAULT 'ACTIVE',
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
);

-- 8. Payments
CREATE TABLE IF NOT EXISTS payments (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id   INT NOT NULL,
    amount           DECIMAL(10,2) NOT NULL,
    payment_status   ENUM('PENDING','SUCCESS','FAILED') DEFAULT 'SUCCESS',
    transaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
);

-- 9. Scheduler Log  (OS scheduling performance metrics)
CREATE TABLE IF NOT EXISTS scheduler_log (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    algorithm      ENUM('FCFS','PRIORITY','ROUND_ROBIN') NOT NULL,
    reservation_id INT NOT NULL,
    arrival_time   DATETIME NOT NULL,
    start_time     DATETIME NOT NULL,
    finish_time    DATETIME NOT NULL,
    waiting_time_s INT GENERATED ALWAYS AS (TIMESTAMPDIFF(SECOND, arrival_time, start_time)) STORED,
    turnaround_s   INT GENERATED ALWAYS AS (TIMESTAMPDIFF(SECOND, arrival_time, finish_time)) STORED,
    logged_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
);

-- 10. RAG (Resource Allocation Graph) snapshot
CREATE TABLE IF NOT EXISTS rag_edges (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    edge_type     ENUM('REQUEST','ASSIGNMENT') NOT NULL,
    process_id    INT NOT NULL   COMMENT 'reservation id acting as process',
    resource_type ENUM('SLOT','EV_CHARGER') NOT NULL,
    resource_id   INT NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
-- INDEXES for performance
-- ─────────────────────────────────────────────────────────────
CREATE INDEX idx_reservations_status  ON reservations(status);
CREATE INDEX idx_reservations_user    ON reservations(user_id);
CREATE INDEX idx_slots_status         ON parking_slots(status);
CREATE INDEX idx_slots_type           ON parking_slots(slot_type);
CREATE INDEX idx_scheduler_algo       ON scheduler_log(algorithm);

-- ─────────────────────────────────────────────────────────────
-- TRIGGERS
-- ─────────────────────────────────────────────────────────────

-- T1: When a reservation is CONFIRMED → mark slot OCCUPIED (and charger IN_USE)
DELIMITER $$
CREATE TRIGGER trg_after_reservation_confirmed
AFTER UPDATE ON reservations
FOR EACH ROW
BEGIN
    IF NEW.status = 'CONFIRMED' AND OLD.status != 'CONFIRMED' THEN
        UPDATE parking_slots SET status = 'OCCUPIED'  WHERE id = NEW.slot_id;
        IF NEW.charger_id IS NOT NULL THEN
            UPDATE ev_chargers SET status = 'IN_USE'  WHERE id = NEW.charger_id;
        END IF;
    ELSEIF NEW.status IN ('COMPLETED','CANCELLED') AND OLD.status = 'CONFIRMED' THEN
        UPDATE parking_slots SET status = 'AVAILABLE' WHERE id = NEW.slot_id;
        IF NEW.charger_id IS NOT NULL THEN
            UPDATE ev_chargers SET status = 'AVAILABLE' WHERE id = NEW.charger_id;
        END IF;
    END IF;
END$$
DELIMITER ;

-- T2: Auto-create payment record when reservation is CONFIRMED
DELIMITER $$
CREATE TRIGGER trg_auto_payment_on_confirm
AFTER UPDATE ON reservations
FOR EACH ROW
BEGIN
    DECLARE hours_parked DECIMAL(10,2);
    DECLARE rate         DECIMAL(10,2);
    IF NEW.status = 'CONFIRMED' AND OLD.status != 'CONFIRMED' THEN
        SET hours_parked = GREATEST(1, TIMESTAMPDIFF(HOUR, NEW.start_time, NEW.end_time));
        SET rate = CASE NEW.vehicle_type
                     WHEN 'EV'        THEN 40.00
                     WHEN 'EMERGENCY' THEN 0.00
                     ELSE 20.00
                   END;
        INSERT INTO payments (reservation_id, amount, payment_status)
        VALUES (NEW.id, hours_parked * rate, 'PENDING');
    END IF;
END$$
DELIMITER ;

-- T3: When session ends, mark reservation COMPLETED
DELIMITER $$
CREATE TRIGGER trg_session_end_complete_reservation
AFTER UPDATE ON sessions
FOR EACH ROW
BEGIN
    IF NEW.session_status = 'ENDED' AND OLD.session_status = 'ACTIVE' THEN
        UPDATE reservations SET status = 'COMPLETED' WHERE id = NEW.reservation_id;
    END IF;
END$$
DELIMITER ;

-- ─────────────────────────────────────────────────────────────
-- VIEWS
-- ─────────────────────────────────────────────────────────────

-- V1: Dashboard metrics card
CREATE OR REPLACE VIEW v_dashboard_metrics AS
SELECT
    (SELECT COUNT(*) FROM parking_slots)                              AS total_slots,
    (SELECT COUNT(*) FROM parking_slots WHERE status = 'AVAILABLE')   AS available_slots,
    (SELECT COUNT(*) FROM parking_slots WHERE status = 'OCCUPIED')    AS occupied_slots,
    (SELECT COUNT(*) FROM parking_slots WHERE status = 'RESERVED')    AS reserved_slots,
    (SELECT COUNT(*) FROM parking_slots WHERE slot_type='EV_CHARGING') AS ev_slots,
    (SELECT COUNT(*) FROM reservations WHERE status = 'CONFIRMED')    AS active_reservations,
    (SELECT COUNT(*) FROM reservations WHERE DATE(created_at)=CURDATE()) AS bookings_today;

-- V2: Full slot status with lot name
CREATE OR REPLACE VIEW v_slot_status AS
SELECT
    ps.id,
    ps.slot_number,
    ps.slot_type,
    ps.status,
    pl.name  AS lot_name,
    pl.location
FROM parking_slots ps
JOIN parking_lots pl ON pl.id = ps.lot_id;

-- V3: Active reservations with user & slot detail
CREATE OR REPLACE VIEW v_active_reservations AS
SELECT
    r.id        AS reservation_id,
    u.name      AS user_name,
    u.email,
    ps.slot_number,
    ps.slot_type,
    r.vehicle_type,
    r.priority,
    r.status,
    r.start_time,
    r.end_time,
    r.created_at
FROM reservations r
JOIN users u         ON u.id  = r.user_id
JOIN parking_slots ps ON ps.id = r.slot_id
WHERE r.status IN ('PENDING','CONFIRMED');

-- V4: Scheduling performance summary
CREATE OR REPLACE VIEW v_scheduler_performance AS
SELECT
    algorithm,
    COUNT(*)          AS total_jobs,
    AVG(waiting_time_s) AS avg_waiting_sec,
    AVG(turnaround_s)   AS avg_turnaround_sec,
    MAX(waiting_time_s) AS max_waiting_sec
FROM scheduler_log
GROUP BY algorithm;

-- V5: Payment summary
CREATE OR REPLACE VIEW v_payment_summary AS
SELECT
    p.id,
    u.name     AS user_name,
    ps.slot_number,
    p.amount,
    p.payment_status,
    p.transaction_time
FROM payments p
JOIN reservations r  ON r.id  = p.reservation_id
JOIN users u         ON u.id  = r.user_id
JOIN parking_slots ps ON ps.id = r.slot_id;

-- ─────────────────────────────────────────────────────────────
-- STORED PROCEDURES
-- ─────────────────────────────────────────────────────────────

-- SP1: Book a slot (ACID transaction, mutex-style SELECT FOR UPDATE)
DELIMITER $$
CREATE PROCEDURE sp_book_slot(
    IN  p_user_id      INT,
    IN  p_slot_id      INT,
    IN  p_charger_id   INT,
    IN  p_vehicle_type VARCHAR(20),
    IN  p_start        DATETIME,
    IN  p_end          DATETIME,
    OUT p_reservation_id INT,
    OUT p_message        VARCHAR(255)
)
BEGIN
    DECLARE v_slot_status VARCHAR(20);
    DECLARE v_charger_status VARCHAR(20);
    DECLARE v_priority INT DEFAULT 5;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_reservation_id = -1;
        SET p_message = 'Transaction failed — rolled back.';
    END;

    START TRANSACTION;

    -- Lock the slot row (critical section)
    SELECT status INTO v_slot_status FROM parking_slots WHERE id = p_slot_id FOR UPDATE;

    IF v_slot_status != 'AVAILABLE' THEN
        ROLLBACK;
        SET p_reservation_id = -1;
        SET p_message = 'Slot not available';
    ELSE
        -- Optional charger lock
        IF p_charger_id IS NOT NULL THEN
            SELECT status INTO v_charger_status FROM ev_chargers WHERE id = p_charger_id FOR UPDATE;
            IF v_charger_status != 'AVAILABLE' THEN
                ROLLBACK;
                SET p_reservation_id = -1;
                SET p_message = 'EV Charger not available';
            END IF;
        END IF;

        -- Assign priority based on vehicle type
        SET v_priority = CASE p_vehicle_type
                           WHEN 'EMERGENCY' THEN 1
                           WHEN 'EV'        THEN 3
                           WHEN 'CAR'       THEN 5
                           ELSE 7
                         END;

        -- Mark slot RESERVED immediately
        UPDATE parking_slots SET status = 'RESERVED' WHERE id = p_slot_id;

        -- Insert reservation
        INSERT INTO reservations (user_id, slot_id, charger_id, vehicle_type, priority, status, start_time, end_time)
        VALUES (p_user_id, p_slot_id, p_charger_id, p_vehicle_type, v_priority, 'PENDING', p_start, p_end);

        SET p_reservation_id = LAST_INSERT_ID();
        SET p_message = 'Reservation created successfully';

        COMMIT;
    END IF;
END$$
DELIMITER ;

-- SP2: Cancel a reservation
DELIMITER $$
CREATE PROCEDURE sp_cancel_reservation(
    IN  p_reservation_id INT,
    IN  p_user_id        INT,
    OUT p_message        VARCHAR(255)
)
BEGIN
    DECLARE v_status  VARCHAR(20);
    DECLARE v_slot_id INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_message = 'Cancellation failed.';
    END;

    START TRANSACTION;

    SELECT status, slot_id INTO v_status, v_slot_id
    FROM reservations WHERE id = p_reservation_id AND user_id = p_user_id FOR UPDATE;

    IF v_status IS NULL THEN
        ROLLBACK;
        SET p_message = 'Reservation not found';
    ELSEIF v_status NOT IN ('PENDING','CONFIRMED') THEN
        ROLLBACK;
        SET p_message = CONCAT('Cannot cancel reservation in status: ', v_status);
    ELSE
        UPDATE reservations SET status = 'CANCELLED' WHERE id = p_reservation_id;
        UPDATE parking_slots  SET status = 'AVAILABLE' WHERE id = v_slot_id;
        COMMIT;
        SET p_message = 'Reservation cancelled';
    END IF;
END$$
DELIMITER ;

-- SP3: End a parking session
DELIMITER $$
CREATE PROCEDURE sp_end_session(
    IN  p_session_id     INT,
    OUT p_message        VARCHAR(255)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_message = 'End session failed.';
    END;

    START TRANSACTION;
    UPDATE sessions SET session_status = 'ENDED', exit_time = NOW()
    WHERE id = p_session_id AND session_status = 'ACTIVE';
    COMMIT;
    SET p_message = 'Session ended';
END$$
DELIMITER ;

-- SP4: Scheduling performance report
DELIMITER $$
CREATE PROCEDURE sp_scheduling_report()
BEGIN
    SELECT * FROM v_scheduler_performance;
END$$
DELIMITER ;

-- ─────────────────────────────────────────────────────────────
-- SEED DATA
-- ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO parking_lots (id, name, total_slots, location)
VALUES (1, 'Central Campus Deck', 20, 'Block E, GEU Dehradun');

INSERT IGNORE INTO parking_slots (lot_id, slot_number, slot_type, status) VALUES
(1,'A-01','STANDARD','AVAILABLE'),
(1,'A-02','STANDARD','AVAILABLE'),
(1,'A-03','STANDARD','AVAILABLE'),
(1,'A-04','STANDARD','AVAILABLE'),
(1,'A-05','STANDARD','AVAILABLE'),
(1,'A-06','STANDARD','AVAILABLE'),
(1,'A-07','STANDARD','AVAILABLE'),
(1,'A-08','STANDARD','AVAILABLE'),
(1,'A-09','STANDARD','OCCUPIED'),
(1,'A-10','STANDARD','OCCUPIED'),
(1,'B-01','EV_CHARGING','AVAILABLE'),
(1,'B-02','EV_CHARGING','AVAILABLE'),
(1,'B-03','EV_CHARGING','AVAILABLE'),
(1,'B-04','EV_CHARGING','OCCUPIED'),
(1,'C-01','EMERGENCY','AVAILABLE'),
(1,'C-02','EMERGENCY','AVAILABLE'),
(1,'C-03','EMERGENCY','AVAILABLE');

INSERT IGNORE INTO ev_chargers (id, charger_code, status) VALUES
(1,'EV-BAY-1','AVAILABLE'),
(2,'EV-BAY-2','AVAILABLE'),
(3,'EV-BAY-3','IN_USE');

-- Admin user (password: admin123)
INSERT IGNORE INTO users (id, name, email, password_hash, role)
VALUES (1,'Admin','admin@sptrm.com','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh7i','ADMIN');

-- Test regular user (password: user123)
INSERT IGNORE INTO users (id, name, email, password_hash, role)
VALUES (2,'Shrey Mittal','shrey@sptrm.com','$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','USER');
