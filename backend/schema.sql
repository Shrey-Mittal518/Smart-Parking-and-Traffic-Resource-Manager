-- Matches the existing sptrm database schema.
-- The app creates this table automatically via initDb() on startup.

CREATE DATABASE IF NOT EXISTS sptrm
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sptrm;

CREATE TABLE IF NOT EXISTS users (
  user_id       INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(120) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'user',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);
