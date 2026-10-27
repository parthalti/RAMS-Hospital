# RAMS-Hospital Patch Review — 27 October 2026

## Implemented

- RH-15: Bed approval claims a bed through a conditional `updateMany` compare-and-set (`id`, `AVAILABLE`, and `currentPatientId: null`). Stale-resource recovery updates the allocation request only while it is still `RECOMMENDED`, avoiding a losing concurrent approval resetting a winning `ALLOCATED` request to `PENDING`.
- RH-15: Added integration regression coverage for two different requests competing for the same bed and for two concurrent approvals of the same request.
- RH-16: Extracted a deterministic bed ranking helper. Compatible beds in the patient's department rank first, then bed numbers use natural numeric ordering (for example, A-2 before A-10). Ranking does not mutate the input list.
- RH-16: Added unit tests for department preference, fallback ordering, natural numeric ordering, and input immutability.
- Submission ZIP excludes `.env`, `node_modules`, generated `dist`, coverage output, `tsconfig.tsbuildinfo`, and `.git` metadata.
- Added `.github/workflows/ci.yml` to run backend dependency installation, Prisma generation/migrations, backend build and Jest against an isolated PostgreSQL service, plus the frontend production build. The workflow has been added but has not run on GitHub yet.
- Added README guidance for CI and warned that seeded demo credentials are local-only.

## Verification performed in this environment

- ZIP integrity: verified with `unzip -t`.
- Archive hygiene: checked archive paths for `.env`, `node_modules`, `dist`, coverage artifacts, and TypeScript build-info artifacts.
- Secret-pattern scan: no matches for a small set of high-confidence private-key / cloud-key / GitHub-token patterns. This is not a complete secrets audit and does not verify Git history or credential rotation.
- Standalone ranking helper: compiled with the globally available TypeScript compiler and ran a Node assertion for same-department preference, natural numeric ordering, and input immutability; passed.

## Not verified

- Full backend TypeScript build and Jest suite: dependency installation (`npm ci`) repeatedly timed out, leaving an incomplete `node_modules` tree.
- Prisma client generation and PostgreSQL integration tests: not run. Use a disposable PostgreSQL test database only; do not run integration tests against the development or production database.
- Frontend build / browser walkthrough: not verified in this environment.
- Secrets: the cleaned archive contains no `.env` file, but that does not prove previously exposed credentials were rotated or removed from repository history. Rotate any real credentials and inspect repository history separately.

## Jira handling

RH-15, RH-16, and RH-17 remain In Progress until required verification and any credential rotation are confirmed. No issue was marked Done.
