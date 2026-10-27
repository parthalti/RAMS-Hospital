# RAMS-Hospital PBL Demo and Viva Guide

## Project in one sentence
RAMS-Hospital is a full-stack hospital resource management system that manages patients, bed allocation, operation-theatre bookings, emergency overrides, staff rosters, alerts, and audit records.

## Architecture
- Frontend: React, TypeScript, Vite, Tailwind CSS, React Router.
- Backend: Node.js, Express, TypeScript; route/controller/service separation.
- Data: PostgreSQL through Prisma ORM.
- Authentication: JWT sessions and bcrypt password hashing; authorization is enforced by backend middleware.
- CI: GitHub Actions provisions a disposable PostgreSQL service, installs dependencies, generates Prisma Client, applies migrations, builds/tests the backend, and builds the frontend.

## Safe local setup
1. Install Node.js 20+ and PostgreSQL 14+.
2. Create a **disposable local evaluation database**. Never point tests at a production or personal data database.
3. Copy the root `.env.example` to `backend/.env`; set `DATABASE_URL`, a unique local `JWT_SECRET`, `PORT=4000`, `NODE_ENV=development`, and `CORS_ORIGIN=http://localhost:5173`.
4. In `backend`, run `npm ci`, `npx prisma generate`, `npx prisma migrate deploy`, and `npm run prisma:seed`.
5. In a second terminal, run `npm ci` in `frontend`.
6. Start the backend with `npm run dev` from `backend`, and start the frontend with `npm run dev` from `frontend`.
7. Open `http://localhost:5173`. Confirm the API base URL is `http://localhost:4000/api` unless you configured another value.

## Demo credentials warning
The seed script creates sample users (admin@rams.com, head@rams.com, doctor@rams.com, doctor2@rams.com, nurse@rams.com) with the shared development password `Password123!`. These are **public sample credentials for local evaluation only**. Never deploy them, expose them to real users, or reuse the password. Do not connect the demo application to real patient data.

## Suggested 8–10 minute demo
Use synthetic/demo records only. Reset to a disposable database before the presentation if you need a clean state.

1. **Login and role enforcement (1 min):** sign in as the administrator; show the dashboard and role-aware navigation. If time permits, sign in as a doctor/nurse and show the reduced permissions.
2. **Patient and bed workflow (2 min):** open Patients and Beds. Show a pending patient and available beds. Create or select an allocation request and run the recommendation engine.
3. **Human approval and race protection (2 min):** in Allocation Control Center, show the recommended resource and explanation. Approve only after the server re-checks availability. Explain that if the bed was taken after recommendation, the stale recommendation must not allocate it.
4. **OT conflict detection (2 min):** show the seeded confirmed booking OTB-0001 for OT-01 from 10:00 to 12:00 on the seeded date. Demonstrate an overlapping request (e.g. 11:00–13:00) being detected and a back-to-back request (12:00–14:00) being non-overlapping. Do not rely on the seeded date being tomorrow after the database was seeded; inspect the stored date first.
5. **Emergency override (1 min):** show the pending override flow and explain that approval confirms the emergency booking and cancels the conflicting booking atomically, while rejection preserves the existing booking.
6. **Audit and alerts (1 min):** show the audit trail and configured occupancy thresholds.

Only demonstrate flows that you have personally confirmed working in the running application. If an item cannot be reproduced, state that honestly rather than claiming it was tested.

## Critical design explanations
- **Recommendation versus decision:** the engine persists its recommendation; an authorized administrator makes the final decision. The system retains both records for traceability.
- **Concurrency protection:** approval re-checks availability inside a database transaction and uses a conditional update so two concurrent requests cannot both claim the same bed.
- **OT overlap rule:** two intervals overlap when each starts before the other ends; adjacent bookings such as 10:00–12:00 and 12:00–14:00 are not conflicting.
- **Emergency override:** the conflict is recorded as a pending override. Approval and cancellation are transactional; rejection leaves the existing confirmed booking unchanged.
- **Authorization:** hiding a button is not security. Backend middleware validates user identity and role for protected endpoints.
- **Auditability:** important actions are recorded so the system can explain who made a decision and when.

## Common viva questions
**Why PostgreSQL?** It provides relational integrity and transactions for related hospital resources and allocation decisions.

**Why Prisma?** It provides typed database access, schema/migration management, and a consistent data model for the TypeScript backend.

**Why keep AllocationRequest and AllocationDecision separate?** To preserve the initial recommendation separately from the administrator's final approval, rejection, or manual choice.

**What is a race condition here?** Two approval requests may observe the same bed as available. A transactional re-check and conditional update ensure only one can claim it.

**How do you test OT conflict logic?** Test a true overlap, a non-overlapping adjacent interval, and emergency approve/reject behavior. The integration suites use a disposable PostgreSQL database.

**What does CI prove?** For the commit shown on the Actions page, it proves the configured dependency installation, Prisma generation/migrations, backend build/Jest suite, and frontend build completed. It does not prove every user journey or production deployment works.

**What are the main limitations?** This is an academic/demo system, not a certified clinical system. Do not use it for real patient data or operational hospital decisions. Review roster handling for overnight shifts, deployment security, backups, monitoring, and clinical workflow requirements before any production use.

## Evidence to capture for evaluation
- GitHub repository and green Actions run.
- Login/dashboard.
- Allocation recommendation followed by administrator decision.
- OT conflict and back-to-back examples.
- Emergency override approve/reject.
- Audit log and alert view.
- Jira sprint board showing the real status of work.
