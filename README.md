# RAMS-Hospital

**Resource Allocation and Management System for Multi-Speciality Hospitals**

A full-stack hospital resource management system: bed allocation, OT booking with
conflict detection, an automatic recommendation engine with mandatory administrator
approval, emergency override handling, duty rosters, configurable alerts, and a
complete audit trail. Every important action is backed by a real PostgreSQL database
— there is no mock data, no frontend-only business logic, and no cosmetic buttons.

---

## 1. Project Overview

RAMS-Hospital centralizes resource management for a multi-speciality hospital,
replacing manual/department-siloed processes with a rule-based system that:

- Recommends beds and OT slots automatically, but **never finalizes an allocation
  without administrator approval**.
- Detects real scheduling conflicts for operation theatres using database-backed
  interval overlap checks (not frontend guesswork).
- Routes emergency requests that conflict with existing bookings through an
  explicit **emergency override** workflow.
- Re-checks resource availability at the moment of approval (not just at
  recommendation time), so a race condition between two requests can never result
  in a bed or OT being double-allocated.
- Logs every significant action to an audit trail.

## 2. Features

- JWT authentication with bcrypt password hashing
- Four roles enforced by **backend middleware** (never just hidden buttons):
  Hospital Administrator, Department Head, Doctor, Nurse/Front Desk
- Patient admission and bed allocation engine (criteria-based, explainable)
- Admin Allocation Control Center: approve / reject / choose another / manual override
- OT booking with true time-range conflict detection and alternative slot suggestions
- Emergency override workflow with admin approval/rejection
- Bed release and reassignment (transaction-safe)
- Duty roster creation, shift assignment, publishing, and change requests
- Configurable occupancy alert thresholds with automatic alert generation
- Real-time dashboard computed entirely from the database
- Full audit logging
- Automated tests for the critical business rules (conflict overlap, race-condition
  approval, manual override, emergency bump/preserve behavior, role enforcement)

## 3. Architecture

```
rams-hospital/
├── backend/                 Express + TypeScript API
│   ├── prisma/
│   │   ├── schema.prisma    All data models, enums, relations, indexes
│   │   └── seed.ts          Demo data (departments, beds, OTs, users, patients...)
│   ├── src/
│   │   ├── controllers/     Request handling only — no business logic
│   │   ├── routes/          Route wiring + role authorization per endpoint
│   │   ├── services/        All business logic (allocation engine, conflict
│   │   │                    detection, emergency override, rosters, alerts...)
│   │   ├── middleware/      authenticateUser, authorizeRole, validation, errors
│   │   ├── validators/      Zod schemas for every mutating endpoint
│   │   ├── utils/           ApiError, asyncHandler, ID generators
│   │   ├── lib/prisma.ts    Shared Prisma client
│   │   ├── app.ts / server.ts
│   └── tests/               Jest + Supertest integration tests, one pure unit test
└── frontend/                 React + TypeScript + Vite + Tailwind
    └── src/
        ├── pages/            One page per feature area (see Frontend Pages below)
        ├── layouts/          Role-aware sidebar navigation
        ├── contexts/         AuthContext (JWT, current user)
        ├── services/api.ts   Typed fetch wrapper
        └── types/            Shared TypeScript types mirroring the API
```

## 4. Technology Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router, Lucide icons
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** JWT + bcrypt
- **Validation:** Zod
- **Testing:** Jest + Supertest

## 5. Database Schema

See `backend/prisma/schema.prisma` for the authoritative definitions. Core models:
`User`, `Department`, `Patient`, `Bed`, `OperationTheatre`, `OTBooking`,
`EmergencyOverride`, `DutyRoster`, `Shift`, `RosterChangeRequest`,
`AllocationRequest`, `AllocationDecision`, `AlertThreshold`, `Alert`, `AuditLog`.

Key design points:
- `AllocationRequest` and `AllocationDecision` are **separate models** so that the
  engine's original recommendation and the administrator's final decision (approve /
  reject / manual override) are both permanently preserved, even when they differ.
- `Bed.currentPatientId` and `Patient.admissionStatus` are updated together, inside
  a transaction, whenever a bed is allocated, released, or reassigned.
- `OTBooking.status` includes `CONFLICT_PENDING_OVERRIDE`, a distinct state used
  only when an emergency request collides with an existing booking and is awaiting
  an administrator's override decision.

## 6. Environment Variables

Copy `.env.example` to `backend/.env` and fill in real values:

```
DATABASE_URL="postgresql://rams_user:rams_password@localhost:5432/rams_hospital?schema=public"
JWT_SECRET="a-long-random-string"
JWT_EXPIRES_IN="8h"
PORT=4000
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173"
```

For the frontend, create `frontend/.env` (optional — defaults to `http://localhost:4000/api`):

```
VITE_API_BASE_URL="http://localhost:4000/api"
```

## 7. Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ running locally or accessible remotely

## 8. Installation & Database Setup

```bash
# 1. Create the database (adjust user/password/db name to match your .env)
createdb rams_hospital
# or, from psql:
#   CREATE DATABASE rams_hospital;
#   CREATE USER rams_user WITH PASSWORD 'rams_password';
#   GRANT ALL PRIVILEGES ON DATABASE rams_hospital TO rams_user;

# 2. Backend
cd backend
cp ../.env.example .env    # then edit backend/.env with your real DATABASE_URL etc.
npm install
npx prisma generate        # generates the Prisma client from schema.prisma
npx prisma migrate dev --name init   # creates tables from the schema
npm run prisma:seed        # loads demo departments/users/beds/OTs/patients

# 3. Frontend (separate terminal)
cd ../frontend
npm install
```

> **Note on this delivery:** `prisma generate` downloads a small query-engine
> binary from Prisma's CDN. The sandbox this project was assembled in could not
> reach that CDN, so the Prisma client here still has placeholder types (you'll
> see this if you inspect `backend/node_modules/.prisma/client`). This is a
> one-time step that resolves itself the first time you run `npx prisma generate`
> with normal internet access — nothing in the application code needs to change.

## 9. Running the Application

```bash
# Terminal 1 — backend (http://localhost:4000)
cd backend
npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend
npm run dev
```

Visit `http://localhost:5173` and sign in with one of the demo accounts below.

## 10. Demo Accounts

All demo accounts use the password: **`Password123!`**

| Role                | Email               |
|---------------------|---------------------|
| Hospital Admin       | admin@rams.com       |
| Department Head      | head@rams.com        |
| Doctor               | doctor@rams.com / doctor2@rams.com |
| Nurse / Front Desk   | nurse@rams.com       |

These are development/demo credentials only — change them (and rotate `JWT_SECRET`)
before any real deployment.

## 11. API Overview

All endpoints are prefixed with `/api`. Every route except `/auth/login` requires
`Authorization: Bearer <token>`. Role restrictions are enforced server-side in
`backend/src/routes/*.ts` via `authorizeRole(...)` — the frontend hides buttons the
current role cannot use, but the backend is the actual gatekeeper.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/login`, `GET /auth/me` |
| Users | `GET/POST /users` (Admin) |
| Departments | `GET /departments`, `POST /departments` (Admin) |
| Beds | `GET /beds`, `GET /beds/available`, `POST /beds` (Admin), `PUT /beds/:id` (Admin), `POST /beds/:id/release`, `POST /beds/:id/reassign` (Admin) |
| Operation Theatres | `GET /ots`, `POST /ots` (Admin), `GET /ots/schedule` |
| OT Bookings | `GET/POST /ot-bookings`, `GET /ot-bookings/:id`, `POST /ot-bookings/:id/confirm` (Admin), `POST /ot-bookings/:id/reject` (Admin) |
| Patients | `GET/POST /patients`, `GET /patients/:id`, `PUT /patients/:id` |
| Allocation | `GET/POST /allocation-requests`, `GET /allocation-requests/:id`, `POST /allocation-requests/:id/run-engine` (Admin), `.../approve` (Admin), `.../reject` (Admin), `.../manual-allocation` (Admin) |
| Emergency | `GET /emergency-requests`, `GET /emergency-requests/:id`, `POST .../approve` (Admin), `POST .../reject` (Admin) |
| Rosters | `GET/POST /rosters`, `GET /rosters/my-shifts`, `POST /rosters/:id/shifts`, `POST /rosters/:id/publish`, `POST /rosters/:id/change-requests`, `PUT /rosters/change-requests/:id` |
| Alerts | `GET /alerts`, `POST /alerts/evaluate` (Admin), `PUT /alerts/:id/resolve` (Admin), `GET/PUT /alerts/thresholds/...` (Admin) |
| Dashboard | `GET /dashboard/summary` |
| Audit | `GET /audit-logs` (Admin) |

## 12. Allocation Engine Logic

**The engine recommends. The administrator decides. These are never the same step.**

```
Nurse/Doctor creates AllocationRequest
        ↓
Engine evaluates candidate resources against live DB state
  (bed type match → availability → department fit → no conflicting
   allocation → emergency/priority ranking)
        ↓
AllocationDecision is persisted with:
  - recommendedResourceId
  - criteriaEvaluated (the actual evaluated criteria, never fabricated)
  - recommendationReason (generated from the evaluated data)
        ↓
Request status becomes RECOMMENDED (or stays PENDING if nothing suitable)
        ↓
Admin reviews in the Allocation Control Center
        ↓
   ┌─── Approve ──────► Re-check resource availability INSIDE a transaction.
   │                     If still available: allocate, mark ALLOCATED, audit log.
   │                     If NOT available: return to PENDING, tell the admin to
   │                     re-run the engine — never silently allocates a stale
   │                     recommendation.
   ├─── Reject ───────► Status → REJECTED, reason recorded, resource untouched.
   └─── Manual/Choose ► Admin-selected resource re-verified as available, then
                         allocated. Both the engine's ORIGINAL recommendation and
                         the admin's FINAL choice are stored separately.
```

## 13. Admin Approval Workflow

See section 12 above — approval always re-checks availability inside a database
transaction before mutating anything, which is what prevents the "recommendation
became stale" race condition described in the specification.

## 14. Emergency Workflow

```
Doctor/Dept Head requests an OT slot marked "emergency"
        ↓
conflictDetectionService checks the requested OT + time window
        ↓
   No conflict ──────────────► Booking created as RECOMMENDED (normal flow)
   Conflict + not emergency ─► Rejected immediately with alternative slot
                                 suggestions; no booking is created.
   Conflict + emergency ─────► Booking created as CONFLICT_PENDING_OVERRIDE
                                 and an EmergencyOverride record is created.
        ↓ (emergency only)
Admin reviews the override: sees the emergency patient, requested slot,
the specific conflicting booking, and a recommended action.
        ↓
   Approve ─► emergency booking CONFIRMED, conflicting booking CANCELLED
              (bumped), both changes in one transaction, audit logged.
   Reject  ─► emergency booking REJECTED, the existing confirmed booking
              is left completely unchanged, audit logged.
```

## 15. Testing

Tests live in `backend/tests/`. `conflictDetection.test.ts` is a pure unit test
(no database needed) verifying the overlap rule, including the exact examples from
the specification (a 10:00–12:00 booking conflicts with 11:00–13:00, but not with a
back-to-back 12:00–14:00 request).

The remaining suites (`auth.test.ts`, `bedAllocation.test.ts`, `otBooking.test.ts`)
are real integration tests against Prisma + Postgres, and need a database to run
against. **Point `DATABASE_URL` at a disposable test database — never your dev or
production database** — then run:

```bash
cd backend
npm test
```

These tests cover: login/role enforcement, a bed being recommended only when
actually available, the stale-recommendation race condition at approval time,
manual override preserving the original recommendation, OT conflict detection,
back-to-back (non-conflicting) bookings, and the emergency override
approve/reject-and-preserve behavior.

### Continuous integration

The repository includes `.github/workflows/ci.yml`. GitHub Actions installs dependencies, generates the Prisma client, applies migrations to an isolated PostgreSQL service, runs the backend build and Jest suite, and builds the frontend. Push the project to GitHub and open **Actions** to see the real CI result; adding the workflow locally does not mean the pipeline has already passed.

### Demo account security

The seed script creates local demo users with a shared sample password (`Password123!`). These are for local evaluation only. Never reuse them in a deployed environment; change/remove seeded credentials and set a strong, unique `JWT_SECRET` before deployment.

## 16. Deployment Notes

This is a standard two-process Node/React app:
- Build the backend with `npm run build` (outputs to `backend/dist`) and run it
  with `npm start` behind your process manager of choice (pm2, systemd, a
  container), pointing `DATABASE_URL` at your production Postgres instance and
  using `npx prisma migrate deploy` for schema migrations (not `migrate dev`).
- Build the frontend with `npm run build` (outputs to `frontend/dist`) and serve
  the static files from any static host or CDN, with `VITE_API_BASE_URL` pointing
  at your deployed backend's `/api` path.
- Set a strong, unique `JWT_SECRET` and restrict `CORS_ORIGIN` to your real
  frontend origin in production.

## 17. Requirements Traceability (E01–E06)

| Experiment | Diagram / Requirement | Implementation |
|---|---|---|
| E01 | Admit Patient & Allocate Bed | `POST /patients` → `patientService.admitPatient` → `POST /allocation-requests` → `allocationEngine.runAllocationEngine` → Admin approval (`allocationEngine.approveAllocation`) → `Bed` row updated |
| E01 | Staff duty roster | `rosterService.ts` (createRoster, addShift, publishRoster, roster change requests) |
| E02 | Book OT Slot (use case) | `POST /ot-bookings` → `otBookingService.createOTBooking` |
| E02/E03 | Class diagram entities (Patient, Bed, OperationTheatre, Booking, Allocation) | `prisma/schema.prisma` models |
| E04 | Sequence flow: request → check conflict → recommend → approve → confirm | `otBookingService.createOTBooking` → `conflictDetectionService.findConflictingBookings` → `otBookingService.confirmOTBooking` |
| E04 | `checkConflict()` | `conflictDetectionService.findConflictingBookings` / `hasConflict` |
| E05 | Activity flow: emergency conflict → override request → approval → schedule update | `otBookingService.createOTBooking` (emergency branch) → `emergencyOverrideService.approveEmergencyOverride` / `rejectEmergencyOverride` |
| E05 | `approveOverride()` | `emergencyOverrideService.approveEmergencyOverride` |
| E06 | DFD Process: Check Booking Conflict | `conflictDetectionService.ts` |
| E06 | DFD Process: Generate Recommendation | `bedAllocationService.evaluateBedAllocation`, `otAllocationService.evaluateOTAllocation` |
| E06 | DFD Process: Admin Approval / Decision | `allocationEngine.approveAllocation` / `rejectAllocation` / `manualAllocation` |
| E06 | DFD Data Store: Audit Log | `auditService.ts` / `AuditLog` model |

## 18. Frontend Pages

`/login`, `/dashboard`, `/patients`, `/patients/:id`, `/beds`, `/operation-theatres`,
`/ot-bookings`, `/allocation-center` (Admin), `/emergency-overrides` (Admin, Dept
Head), `/rosters`, `/alerts` (Admin, Dept Head), `/audit-logs` (Admin), `/users`
(Admin), `/settings` (Admin). Navigation and route access both follow the signed-in
user's role; the backend enforces the same restrictions independently.

## 19. Known Limitations / Honest Notes

- This was built and reviewed in a sandboxed environment without full internet
  access to Prisma's binary CDN, so `prisma generate` could not be run end-to-end
  here — do this as your first setup step (section 8) in your own environment.
- The engine's ranking logic (bed allocation, OT allocation) is intentionally
  transparent and rule-based rather than a black box, per the specification's
  requirement that recommendations be explainable from actually-evaluated criteria.
- Roster shift overlap prevention checks the same staff member's shifts by date
  and time-string comparison; for a production deployment you may want to
  standardize shift times to full datetimes for stricter equality/overlap handling
  across roster boundaries (e.g. overnight shifts spanning midnight).
