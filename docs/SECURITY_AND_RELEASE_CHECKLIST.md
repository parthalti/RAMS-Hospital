# RAMS-Hospital Security and Release Checklist

This is a release checklist, not a claim that the application has been security-certified.

## Confirmed repository checks (27 Oct 2026)
- GitHub Actions run for commit `6e3eeefd202129eae95b5efe4f478063efbf24f3` completed successfully.
- Backend dependency install, Prisma Client generation, migrations against the disposable CI PostgreSQL service, backend build, and Jest tests passed in that run.
- Frontend dependency install and production build passed in that run.
- A recursive listing of the current `main` tree showed 139 files and only the intended root `.env.example` matched the filename scan for env/secret/key-like paths. This is a filename check only, **not** a full secret scan or Git-history audit.
- The application has public sample credentials in its README and seed script; treat them as local-demo-only.

## Before sharing a live demo
- [ ] Use synthetic data only. Do not enter real patient or personal information.
- [ ] Run locally against a disposable database; confirm `DATABASE_URL` points to that database before migrations, seed, or tests.
- [ ] Keep `.env` files, tokens, private keys, production database URLs, and personal data out of Git.
- [ ] Use a unique random `JWT_SECRET`; never use the CI placeholder or the example value.
- [ ] Change/remove sample accounts and the shared `Password123!` password before any deployment.
- [ ] Restrict `CORS_ORIGIN` to the intended frontend origin.
- [ ] Use HTTPS, secure deployment secrets, database least privilege, backups, logs/monitoring, and rate limiting before exposing any public service.
- [ ] Review dependencies and run a dedicated secret scanner plus Git-history scan before public release.
- [ ] Test the login, role restrictions, patient creation, bed recommendation/approval, bed release/reassignment, OT conflict, emergency override, roster, alerts, and audit flows in a running local app.
- [ ] Capture evidence only from a successful live run; do not describe CI as proof of every end-to-end flow.

## Do not mark as complete without evidence
- [ ] Actual local runtime demo verified.
- [ ] Credential rotation completed if any real secret was ever committed or shared.
- [ ] Git history reviewed for accidentally committed secrets.
- [ ] Production hosting and deployment configuration validated (not currently established by CI alone).

## Current release status
**CI: passed. Production readiness: not established.** This project is suitable for an academic evaluation demo with synthetic data after local setup and smoke tests; it should not be used as a clinical system or with real patient data.
