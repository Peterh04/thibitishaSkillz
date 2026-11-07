# Manual checklists (beyond static scan)

## Security

- [ ] Secrets only in env / vault; rotated JWT secret; no default keys in deploy
- [ ] No secrets in git, chat logs, CI logs, or error responses; `.env` gitignored
- [ ] `.env.example` has empty placeholders only (no real keys)
- [ ] Gemini / DB / JWT keys never shipped to the frontend bundle
- [ ] HTTPS + HSTS at the edge; secure cookie flags if cookie auth
- [ ] Login / register / AI / upload rate limited (app or API gateway)
- [ ] Account lockout or backoff on brute-force
- [ ] Admin accounts not self-serve; break-glass procedure documented
- [ ] CV files not publicly URL-guessable; virus scanning considered for uploads
- [ ] Dependency scanning (pip/npm audit) in CI
- [ ] Security headers (CSP, X-Content-Type-Options, Referrer-Policy)

## Database

- [ ] Alembic (or equivalent) migrations in CI/CD
- [ ] Automated backups + tested restore
- [ ] Least-privilege DB user (no DDL in app runtime in prod)
- [ ] Connection limits sized for workers
- [ ] PII retention / deletion policy (GDPR-style erase path)

## Reliability & ops

- [ ] Health/readiness endpoints
- [ ] Structured logs + request IDs; no secrets in logs
- [ ] Metrics for 4xx/5xx, assessment latency, Gemini errors
- [ ] Alerting on error rate and AI provider failures
- [ ] Staging environment mirrors prod config shape

## Frontend / UX

- [ ] Vite scaffold removed from product routes
- [ ] Distinct brand direction (tokens, type, imagery) — not AI purple/Inter slop
- [ ] Seeker and employer primary flows complete with loading/empty/error states
- [ ] Accessible forms; mobile + desktop verified
- [ ] Shared API client; auth-aware routing; no secrets in the bundle

## Judging evidence (100 pts)

- [ ] Problem/users/context written (README or pitch) — Problem 15
- [ ] Data/signals explained (schema, cleaning, match/score) — Data 10
- [ ] Main seeker + employer journeys work in UI — SE 25
- [ ] Tests + DEMO.md + metrics + failure cases — Validation 15
- [ ] Demand/impact narrative with realistic use case — Demand 10
- [ ] Deployable (live link or setup); polish list named — Deploy 15
- [ ] Pitch + live demo; Gemini AI usage disclosed — Presentation 10

## Product / compliance

- [ ] Terms for AI-scored assessments; human appeal path
- [ ] Clear consent for CV processing
- [ ] Employer access to candidate data is justified and audited
