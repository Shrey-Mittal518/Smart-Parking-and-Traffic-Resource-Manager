CREATE DATABASE IF NOT EXISTS sptrm_db;
USE sptrm_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('USER', 'ADMIN', 'EMERGENCY_SERVICE') DEFAULT 'USER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    license_plate VARCHAR(20) NOT NULL UNIQUE,
    vehicle_type ENUM('CAR', 'BIKE', 'EV', 'EMERGENCY') DEFAULT 'CAR',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Parking Lots Table
CREATE TABLE IF NOT EXISTS parking_lots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    total_slots INT NOT NULL DEFAULT 50,
    location VARCHAR(255) NOT NULL
);

-- 4. Parking Slots Table
CREATE TABLE IF NOT EXISTS parking_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lot_id INT NOT NULL,
    slot_number VARCHAR(20) NOT NULL,
    slot_type ENUM('STANDARD', 'EV_CHARGING', 'EMERGENCY') DEFAULT 'STANDARD',
    status ENUM('AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE') DEFAULT 'AVAILABLE',
    FOREIGN KEY (lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE,
    UNIQUE KEY unique_lot_slot (lot_id, slot_number)
);

-- 5. EV Chargers (Finite resource for Deadlock/RAG simulation)
CREATE TABLE IF NOT EXISTS ev_chargers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    charger_code VARCHAR(20) NOT NULL UNIQUE,
    status ENUM('AVAILABLE', 'IN_USE') DEFAULT 'AVAILABLE'
);

-- 6. Reservations Table
CREATE TABLE IF NOT EXISTS reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    slot_id INT NOT NULL,
    charger_id INT DEFAULT NULL,
    status ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED') DEFAULT 'PENDING',
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (slot_id) REFERENCES parking_slots(id) ON DELETE RESTRICT,
    FOREIGN KEY (charger_id) REFERENCES ev_chargers(id) ON DELETE SET NULL
);

-- 7. Parking Sessions Table (Real-time Entry/Exit)
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL,
    entry_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    exit_time DATETIME DEFAULT NULL,
    session_status ENUM('ACTIVE', 'ENDED') DEFAULT 'ACTIVE',
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
);

-- 8. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_status ENUM('PENDING', 'SUCCESS', 'FAILED') DEFAULT 'SUCCESS',
    transaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
);

-- Trigger: When reservation is CONFIRMED, mark parking_slots as OCCUPIED
DELIMITER $$
CREATE TRIGGER after_reservation_confirmed
AFTER UPDATE ON reservations
FOR EACH ROW
BEGIN
    IF NEW.status = 'CONFIRMED' THEN
        UPDATE parking_slots SET status = 'OCCUPIED' WHERE id = NEW.slot_id;
        IF NEW.charger_id IS NOT NULL THEN
            UPDATE ev_chargers SET status = 'IN_USE' WHERE id = NEW.charger_id;
        END IF;
    ELSEIF NEW.status IN ('COMPLETED', 'CANCELLED') THEN
        UPDATE parking_slots SET status = 'AVAILABLE' WHERE id = NEW.slot_id;
        IF NEW.charger_id IS NOT NULL THEN
            UPDATE ev_chargers SET status = 'AVAILABLE' WHERE id = NEW.charger_id;
        END IF;
    END IF;
END$$
DELIMITER ;

-- View: Dashboard Analytics Summary
CREATE OR REPLACE VIEW dashboard_metrics AS
SELECT 
    (SELECT COUNT(*) FROM parking_slots) AS total_slots,
    (SELECT COUNT(*) FROM parking_slots WHERE status = 'AVAILABLE') AS available_slots,
    (SELECT COUNT(*) FROM parking_slots WHERE status = 'OCCUPIED') AS occupied_slots,
    (SELECT COUNT(*) FROM parking_slots WHERE slot_type = 'EV_CHARGING') AS ev_charging_slots;

-- Seed initial test lot and slots
INSERT IGNORE INTO parking_lots (id, name, total_slots, location) VALUES (1, 'Central Campus Deck', 16, 'Block E, GEU');

INSERT IGNORE INTO parking_slots (lot_id, slot_number, slot_type, status) VALUES
(1, 'A-01', 'STANDARD', 'AVAILABLE'),
(1, 'A-02', 'STANDARD', 'AVAILABLE'),
(1, 'A-03', 'STANDARD', 'OCCUPIED'),
(1, 'A-04', 'EV_CHARGING', 'AVAILABLE'),
(1, 'A-05', 'EV_CHARGING', 'AVAILABLE'),
(1, 'A-06', 'EMERGENCY', 'AVAILABLE');

INSERT IGNORE INTO ev_chargers (id, charger_code, status) VALUES 
(1, 'EV-BAY-1', 'AVAILABLE'),
(2, 'EV-BAY-2', 'AVAILABLE');
