---
name: company-production-gate
description: >-
  Runs company-grade security, architecture-gap, database, and senior-code
  readiness audits for Thibitisha Skills. Use when the user asks for security
  checks, production readiness, company standards, quality gates, gap analysis,
  or before implementing major backend/frontend features.
---

# Company production gate

## When to use

- Before continuing feature work on a new area
- When the user asks for security / gaps / “is this company ready?”
- After large backend or schema changes

## Workflow

1. Run the scanner (preferred):

```bash
python .cursor/skills/company-production-gate/scripts/audit_scan.py --root .
```

Or via the quality MCP tools: `security_audit`, `architecture_gaps`, `database_audit`, `frontend_audit`, `frontend_design_bar`, `judging_scorecard`, `judging_rubric`, `full_readiness_report`.

2. Read findings; do not dismiss Critical/High without a fix plan.
3. Cross-check [checklists.md](checklists.md) for areas the scanner cannot see (ops, legal, process).
4. Report to the user using this format:

```markdown
## Readiness summary
Verdict: Not ready | Partially ready | Company-ready (with controls)
Critical: N | High: N | Medium: N | Low: N

## Findings
### [SEVERITY] Short title
- Evidence: path / behavior
- Risk: what an attacker or outage does
- Fix: concrete change

## Recommended next work (ordered)
1. ...
```

## Behavior rules while this skill is active

- Act as senior AppSec + staff backend + experienced MySQL DBA.
- Prefer evidence from the repo over generic advice.
- Propose production patterns (Alembic, rate limits, structured logging, secrets manager) over demos.
- Do not generate “basic tutorial” code for fixes — ship mergeable, secure implementations when asked to remediate.
- **Never expose secrets**: no API keys, JWT secrets, DB passwords, tokens, or raw `.env` in reports — redact and use placeholders. Call `secrets_policy` / follow `secrets-hygiene` skill when config is involved.
