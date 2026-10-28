# RAMS-Hospital Security and Release Checklist

This checklist records evidence and outstanding release tasks; it is not a security certification.

## Confirmed repository checks (27 Oct 2026)

- Main commit: 3b7bd3ef2a08fb94c348c294ce14af23916d0b3d.
- CI run https://github.com/parthalti/RAMS-Hospital/actions/runs/40447822752 passed for that commit. It provisions a disposable PostgreSQL service, installs dependencies, generates Prisma Client, applies migrations, builds/tests the backend, type-checks/builds the frontend, and runs HTTP smoke tests.
- Secret Scan run https://github.com/parthalti/RAMS-Hospital/actions/runs/40447822786 passed for that commit.
- The repository filename scan found only the intended root .env.example among env/secret/key-like filenames.
- The application contains public sample credentials in the README and seed script; these are local-demo-only and must not be deployed or reused.
- A separate branch is adding conditional claiming to the manual bed-allocation path and a concurrency regression test. That change is not yet verified until its own CI run passes.

## Before sharing a live demo

- [ ] Use synthetic data only. Do not enter real patient or personal information.
- [ ] Run locally against a disposable evaluation database; confirm DATABASE_URL before migrations, seeding, or tests.
- [ ] Keep .env files, tokens, private keys, production database URLs, and personal data out of Git.
- [ ] Use a unique random JWT_SECRET; never use the CI placeholder or example value.
- [ ] Change/remove sample accounts and the shared Password123! password before any deployment.
- [ ] Restrict CORS_ORIGIN to the intended frontend origin.
- [ ] Use HTTPS, secure deployment secrets, database least privilege, backups, monitoring, and rate limiting before exposing any public service.
- [x] Run a dedicated secret scanner over Git history (run linked above).
- [x] CI dependency audit steps completed successfully for the main commit linked above.
- [ ] Test login, role restrictions, patient creation, bed recommendation/approval, bed release/reassignment, OT conflict, emergency override, roster, alerts, and audit flows in a running local app.
- [ ] Capture screenshots/evidence only from successful live flows; CI does not prove every user journey.

## Do not mark complete without evidence

- [ ] Actual local runtime demo verified.
- [ ] Credential rotation completed if any real secret was ever committed or shared.
- [x] Git history scanned by the dedicated secret scanner for the main commit linked above.
- [ ] Production hosting and deployment configuration validated.

## Current release status

Main CI and secret scan passed. Local end-to-end user journeys, credential rotation, and production readiness are not established by those checks. This is an academic evaluation system only; do not use it as a clinical system or with real patient data.
