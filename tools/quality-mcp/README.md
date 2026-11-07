# Thibitisha Quality MCP

Local MCP server that runs **security**, **architecture**, **database**, and **senior-engineering** gates for this repo.

## Tools

| Tool | Purpose |
|------|---------|
| `full_readiness_report` | Full static readiness scan (backend + frontend) |
| `security_audit` | Auth, secrets, CORS, uploads, AI, rate limits |
| `architecture_gaps` | Entrypoint, deps, CI/tests, missing routes |
| `database_audit` | Migrations, constraints, pool |
| `frontend_audit` | Scaffold, API layer, a11y, UX states, AI-slop UI |
| `frontend_design_bar` | Mandatory senior human UI/UX craft standard |
| `secrets_policy` | Mandatory: never expose keys/tokens/.env values |
| `secret_exposure_scan` | Find likely secret leaks (output always redacted) |
| `senior_engineering_bar` | Mandatory coding standard (BE + FE) |
| `judging_rubric` | Full 100-point hackathon rubric + tie-breakers |
| `judging_scorecard` | Evidence-based self-score + highest-value gaps |
| `review_change_guidance` | Per-area senior review checklist (incl. `judging`) |

Server instructions also tell the agent: never quote API keys, JWT secrets, DB passwords, or `.env` contents — placeholders/redaction only.

## Setup

```bash
python3 -m venv .venv
.venv/bin/pip install -r tools/quality-mcp/requirements.txt
```

Project MCP config (`.cursor/mcp.json`) points at `.venv/bin/python`. Restart Cursor or reload MCP servers after install.

## CLI (no MCP)

```bash
python .cursor/skills/company-production-gate/scripts/audit_scan.py --root .
```

Exit code `1` when Critical/High findings exist (CI-friendly).
