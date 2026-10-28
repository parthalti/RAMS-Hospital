# RAMS-Hospital Patch Review — 27 October 2026

## Verified on main

- Bed approval uses a conditional updateMany compare-and-set (id, AVAILABLE, and currentPatientId: null) inside a transaction.
- Approval recovery only returns a request to PENDING while it is still RECOMMENDED, preventing a losing concurrent approval from overwriting a successful ALLOCATED state.
- Integration tests cover competing approvals for the same bed, concurrent approvals of the same request, stale recommendations, successful approval, and manual override traceability.
- Bed ranking is deterministic: same-department compatible beds rank first, then natural bed-number ordering; tests cover fallback ordering and input immutability.
- GitHub Actions CI and the full-history secret scan both passed for main commit 3b7bd3ef2a08fb94c348c294ce14af23916d0b3d. CI includes backend build/tests with Prisma migrations against a disposable PostgreSQL service, frontend type-check/build, and HTTP smoke tests.
- The release checklist distinguishes automated CI from live end-to-end demo verification and production readiness.

## Change in this branch — awaiting CI verification

- Manual bed allocation previously performed a read-then-unconditional update, allowing two concurrent transactions to race after both read the bed as available.
- This branch replaces that update with an atomic conditional claim (AVAILABLE and currentPatientId: null) and returns a conflict if the claim affects anything other than one row.
- Added a PostgreSQL integration regression test that submits two concurrent manual allocations for the same bed and expects exactly one successful allocation.

## Verification boundaries

- The regression test requires the disposable PostgreSQL integration-test database configured by CI. It must not run against a development or production database.
- The new branch change is not considered verified until its CI run passes.
- A green CI run does not replace the live browser walkthrough for login/roles, patient creation, bed release/reassignment, OT conflicts, emergency override, rosters, alerts, and audit logs.
- A secret scan is evidence about the scanned repository history, not proof that any previously shared credential was rotated. Rotate any real credential that may have been exposed.
- Submission archives must exclude .env, secrets, node_modules, generated dist, coverage output, TypeScript build info, .git, and real patient data.

## Jira tracking

- RH-15 tracks bed-allocation concurrency and remains open until this branch's regression test passes in CI.
- RH-16 tracks alignment between priority evaluation and actual ranking behavior; do not close without reviewing the policy text and ranking tests.
- RH-17 tracks submission archive hygiene and potential credential exposure; close only after the archive is inspected and any real credentials are confirmed rotated.
