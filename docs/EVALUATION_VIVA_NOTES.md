# RAMS-Hospital PBL — Evaluation & Viva Notes

## Project in one sentence
RAMS-Hospital is a React + Vite + Tailwind + TypeScript frontend backed by an Express + TypeScript API, PostgreSQL, and Prisma, for hospital resource allocation, bed admissions, OT scheduling, and auditability.

## Two modules to demonstrate

### 1. Bed allocation and admission
1. A nurse/doctor creates an allocation request for a patient and resource type.
2. The allocation engine evaluates suitable beds and saves a recommendation; it does not allocate automatically.
3. An administrator reviews and approves the recommendation.
4. Approval re-checks availability inside a transaction and atomically claims the bed using a conditional update (`id`, `AVAILABLE`, and `currentPatientId: null`).
5. Only a successful claim updates the patient admission status and request decision. If the bed was claimed by another approval, the request is returned to `PENDING` and a conflict is reported.

### 2. OT scheduling and conflict detection
1. The OT booking flow checks time-window overlap for the requested theatre.
2. A conflicting booking is not silently confirmed; the workflow preserves explicit statuses and supports the applicable review/override flow.
3. Back-to-back bookings should be allowed when one booking ends exactly as the next begins.

## RH-15 — concurrent bed approval
The previous check-then-update pattern had a race: two transactions could both read an available bed. The fix uses a conditional `updateMany` as a compare-and-set. PostgreSQL updates the row only if it still matches the availability predicate; a competing approval that no longer matches gets `count === 0` and follows the conflict path.

A concurrency integration regression test is present in `backend/tests/bedAllocation.test.ts`. It must be executed against a disposable PostgreSQL test database before claiming runtime verification.

## RH-16 — explain ranking accurately
The ranking policy is explicit in `backend/src/services/bedRanking.ts`: prefer a bed in the patient's department, then sort by bed number. Emergency/priority is a patient-level triage signal and does not rank physical beds for the same patient. `backend/tests/bedRanking.test.ts` covers same-department preference, deterministic bed-number ordering, fallback ordering, and non-mutation of input.

## Safe setup and test commands
From the repository root:

```bash
cp .env.example backend/.env
```

Edit `backend/.env` so `DATABASE_URL` points to a **disposable test database** (not a development or production database). Do not copy real credentials into the submission ZIP.

```bash
cd backend
npm ci
npm run prisma:generate
npm run build
npm test
```

Do not run the integration suite against the normal development database: tests create and delete test records and reset test fixture state. Create the disposable database and apply the project's migrations/schema there first.

## CI verification path
The repository includes `.github/workflows/ci.yml`. After pushing this source to GitHub, open the **Actions** tab and check the workflow result. It creates a disposable PostgreSQL service for migrations and integration tests. A workflow file existing locally is not proof that CI has passed.

## Security / submission hygiene
- The submission archive should exclude `.env`, `node_modules`, `dist`, coverage output, and local database files.
- Keep `.env.example` with placeholders only.
- If the original uploaded `backend/.env` held real credentials, rotate the database password and JWT secret. Removing the file from a ZIP does not remove secrets from Git history or invalidate leaked credentials.

## Verification status (2026-10-27)
- Static source review performed and RH-15 conditional claim present.
- RH-16 ranking helper and focused unit tests added.
- Full dependency installation did not complete in this environment; Prisma generation, TypeScript build, and Jest tests have **not** passed verification here.
- Do not represent the modules as fully tested or mark the Jira issues Done until the build and relevant tests pass in the target environment.

## Likely viva questions

**Why use a transaction?** To keep bed state, patient admission state, request status, decision, and audit event consistent.

**Why is a conditional update needed if the code already checks availability?** The earlier read can become stale before the write. The conditional update makes the availability check part of the write itself.

**Why does a failed claim return a conflict?** Another approval may have claimed the bed after the recommendation. The request must be reviewed again rather than double-allocating it.

**Does CRITICAL priority change which bed is best?** It signals clinical urgency. This implementation ranks beds by department match and bed number; the UI should not claim priority changes bed ranking unless that behavior is implemented and tested.

**How do you test safely?** Unit tests can run without a database where designed that way. Prisma integration tests need a disposable PostgreSQL test database, never the normal development or production database.
