# RAMS-Hospital Security and Release Checklist

This is a release checklist, not a claim that the application has been security-certified.

## Confirmed repository checks (27 Oct 2026)
- GitHub Actions run for commit `6e3eeefd202129eae95b5efe4f478063efbf24f3` completed successfully.
- Backend dependency install, Prisma Client generation, migrations against the disposable CI PostgreSQL service, backend build, and Jest tests passed in that run.
- Frontend dependency install and production build passed in that run.
- A recursive filename scan found only the intended root `.env.example` among env/secret/key-like filenames.
- The Gitleaks full-history scan passed for commit `01cd25285f7e43e4830d6c915b77859aaad49f86`; no finding was reported by that run. This is evidence from the scanner, not a guarantee that credentials shared elsewhere are safe.
- The CI workflow now includes backend/frontend dependency audits, frontend type-checking, and HTTP smoke tests for the backend health endpoint and built frontend preview. The latest workflow must finish green before these new checks are marked passed.
- The application has public sample credentials in its README and seed script; treat them as local-demo-only.

## Before sharing a live demo
- [ ] Use synthetic data only. Do not enter real patient or personal information.
- [ ] Run locally against a disposable database; confirm `DATABASE_URL` points to that database before migrations, seed, or tests.
- [ ] Keep `.env` files, tokens, private keys, production database URLs, and personal data out of Git.
- [ ] Use a unique random `JWT_SECRET`; never use the CI placeholder or the example value.
- [ ] Change/remove sample accounts and the shared `Password123!` password before any deployment.
- [ ] Restrict `CORS_ORIGIN` to the intended frontend origin.
- [ ] Use HTTPS, secure deployment secrets, database least privilege, backups, logs/monitoring, and rate limiting before exposing any public service.
- [x] Run a dedicated secret scanner over the repository's Git history (Gitleaks passed for the commit above).
- [ ] Review and resolve any high-severity dependency audit findings from the latest CI run.
- [ ] Test the login, role restrictions, patient creation, bed recommendation/approval, bed release/reassignment, OT conflict, emergency override, roster, alerts, and audit flows in a running local app.
- [ ] Capture evidence only from a successful live run; do not describe CI as proof of every end-to-end flow.

## Do not mark as complete without evidence
- [ ] Actual local runtime demo verified.
- [ ] Credential rotation completed if any real secret was ever committed or shared.
- [x] Git history scanned by Gitleaks for the commit noted above; separately rotate any real credential if you know it was ever shared outside the repository.
- [ ] Production hosting and deployment configuration validated (not currently established by CI alone).

## Current release status
**Core CI: passed on earlier commits. Latest expanded CI: pending confirmation. Production readiness: not established.** This project is suitable for an academic evaluation demo with synthetic data after local setup and smoke tests; it should not be used as a clinical system or with real patient data.
