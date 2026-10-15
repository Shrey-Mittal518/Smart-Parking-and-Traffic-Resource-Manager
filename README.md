# 🚗 Smart Parking & Traffic Resource Manager (SPTRM)

> **Team Levengers** | OS + DBMS Academic Project | Session 2026-27

A full-stack smart parking system that simulates real Operating System concepts (scheduling, synchronisation, deadlock detection) on top of a fully normalised MySQL database with ACID-compliant transactions.

---

## 📌 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture Overview](#-architecture-overview)
- [OS Concepts Implemented](#-os-concepts-implemented)
- [Database Design](#-database-design)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [API Reference](#-api-reference)
- [Seed Credentials](#-seed-credentials)

---

## ✨ Features

| Feature | Details |
|---|---|
| **Slot Booking** | Real-time booking for Standard, EV-Charging, and Emergency slots |
| **Role-based Access** | USER, ADMIN, and EMERGENCY_SERVICE roles |
| **OS Scheduling** | FCFS, Priority Scheduling, and Round Robin simulated on parking requests |
| **Deadlock Detection** | Resource Allocation Graph (RAG) with cycle detection via DFS |
| **Mutex / Semaphore** | Per-slot locks prevent double-booking race conditions |
| **ACID Transactions** | `SELECT FOR UPDATE` critical sections via stored procedures |
| **Auto Payments** | Trigger-generated payment records on reservation confirmation |
| **Admin Panel** | Full CRUD over slots, lots, reservations, and users |
| **Scheduler Dashboard** | Live comparison of algorithm performance metrics |
| **EV Charger Management** | Dedicated charger resource allocation with RAG tracking |

---

## 🛠 Tech Stack

**Frontend**
- React 19 + Vite 8
- React Router v6
- Vanilla CSS (component-scoped)

**Backend**
- Node.js + Express 4
- MySQL 2 (mysql2 driver)
- JSON Web Tokens (JWT) for auth
- bcryptjs for password hashing
- dotenv for config

**Database**
- MySQL — 3NF normalised schema
- Stored Procedures, Triggers, Views, Indexes

---

## 🏗 Architecture Overview

```
┌──────────────────────┐        REST API (JSON)       ┌──────────────────────┐
│   React Frontend     │ ◄──────────────────────────► │   Express Backend     │
│  (Vite dev server)   │       JWT in header          │   (Node.js :5000)     │
└──────────────────────┘                              └──────────┬───────────┘
                                                                 │
                                                    ┌────────────▼────────────┐
                                                    │   OS Engine (in-memory) │
                                                    │  Mutex · Semaphore      │
                                                    │  Scheduler · RAG        │
                                                    └────────────┬────────────┘
                                                                 │
                                                    ┌────────────▼────────────┐
                                                    │   MySQL – sptrm_db      │
                                                    │  SP · Triggers · Views  │
                                                    └─────────────────────────┘
```

---

## ⚙️ OS Concepts Implemented

### Synchronisation
- **Mutex** — per-slot binary lock; only one booking transaction can enter the critical section for a given slot at a time.
- **Semaphore** — counting semaphore controls concurrent access to shared EV charger resources.

### CPU Scheduling (simulated on parking requests)
| Algorithm | Description |
|---|---|
| **FCFS** | Requests served in arrival order |
| **Priority Scheduling** | EMERGENCY (1) → EV (3) → CAR (5) → BIKE (7) |
| **Round Robin** | Fixed time-quantum (800 ms) cycling through the queue |

Each scheduling run returns `waitingMs`, `turnaroundMs`, and aggregate averages for comparison.

### Deadlock Detection & Recovery
- **Resource Allocation Graph** — directed graph with REQUEST and ASSIGNMENT edges.
- **Cycle Detection** — depth-first search on the wait-for graph.
- **Recovery** — the lowest-priority (highest priority number) process in the cycle is preempted.

---

## 🗄 Database Design

### Tables (3NF Normalised)
| Table | Purpose |
|---|---|
| `users` | Accounts with role enum |
| `vehicles` | Vehicles owned by users |
| `parking_lots` | Physical lot definitions |
| `parking_slots` | Individual slots (STANDARD / EV_CHARGING / EMERGENCY) |
| `ev_chargers` | Finite EV charger resources for RAG simulation |
| `reservations` | Booking records with priority and status |
| `sessions` | Real-time entry/exit tracking |
| `payments` | Auto-generated on confirmation via trigger |
| `scheduler_log` | Persists scheduling algorithm metrics |
| `rag_edges` | Snapshots of RAG request/assignment edges |

### Key DB Objects
- **3 Triggers** — auto-update slot status, auto-create payments, auto-complete reservation on session end.
- **4 Stored Procedures** — `sp_book_slot` (ACID, `SELECT FOR UPDATE`), `sp_cancel_reservation`, `sp_end_session`, `sp_scheduling_report`.
- **5 Views** — dashboard metrics, slot status, active reservations, scheduler performance, payment summary.

---

## 📁 Project Structure

```
Smart-Parking-and-Traffic-Resource-Manager/
├── backend/
│   ├── server.js           # Express entry point
│   ├── os_engine.js        # Mutex, Semaphore, Scheduler, RAG
│   ├── db.js               # MySQL connection pool
│   ├── schema.sql          # Full DB schema + seed data
│   ├── file.env            # Environment variables (not committed)
│   ├── middleware/
│   │   └── auth.js         # JWT verification middleware
│   └── routes/
│       ├── auth.js         # /api/auth — register / login
│       ├── parking.js      # /api/parking — slots & lots
│       ├── reservations.js # /api/reservations — book / cancel
│       ├── scheduler.js    # /api/scheduler — OS scheduling demo
│       └── admin.js        # /api/admin — admin-only routes
└── frontend/
    └── smart_parking/
        ├── src/
        │   ├── App.jsx
        │   ├── main.jsx
        │   ├── api.js              # Axios/fetch wrappers
        │   ├── login.jsx / .css
        │   ├── dashboard.jsx / .css
        │   └── pages/
        │       ├── BookSlot.jsx
        │       ├── MyBookings.jsx
        │       ├── Scheduler.jsx   # Scheduling visualiser
        │       └── AdminPanel.jsx
        └── vite.config.js
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- MySQL ≥ 8.0
- npm

### 1. Database Setup

```sql
-- Run the schema file in your MySQL client
SOURCE backend/schema.sql;
```

### 2. Backend

```bash
cd backend
npm install

# Create file.env (copy the template below)
npm run dev        # nodemon hot-reload
# or
npm start          # production
```

**`backend/file.env`**
```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=sptrm_db
JWT_SECRET=your_jwt_secret
```

### 3. Frontend

```bash
cd frontend/smart_parking
npm install
npm run dev        # Vite dev server — http://localhost:5173
```

---

## 📡 API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | ✗ | Register a new user |
| POST | `/api/auth/login` | ✗ | Login, returns JWT |
| GET | `/api/parking/slots` | ✓ | List all parking slots |
| GET | `/api/parking/lots` | ✓ | List all parking lots |
| POST | `/api/reservations/book` | ✓ | Book a slot (calls `sp_book_slot`) |
| GET | `/api/reservations/my` | ✓ | Get current user's reservations |
| PUT | `/api/reservations/cancel/:id` | ✓ | Cancel a reservation |
| GET | `/api/scheduler/run` | ✓ | Run all 3 scheduling algorithms |
| GET | `/api/scheduler/rag` | ✓ | Get RAG snapshot |
| GET | `/api/admin/dashboard` | ADMIN | Dashboard metrics view |
| GET | `/api/admin/users` | ADMIN | List all users |
| GET | `/api/health` | ✗ | Health check |

---

## 🔑 Seed Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@sptrm.com` | `admin123` |
| User | `shrey@sptrm.com` | `user123` |
