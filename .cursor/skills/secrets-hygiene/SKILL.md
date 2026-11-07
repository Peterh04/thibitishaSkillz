---
name: secrets-hygiene
description: >-
  Prevents exposure of API keys, JWT secrets, database passwords, tokens, .env
  contents, and PII in chat, commits, logs, and code. Use when reading .env,
  configuring Gemini/DB/JWT, debugging auth, reviewing diffs for secrets, or
  when the user mentions keys, credentials, or leaks.
---

# Secrets hygiene

## Absolute rules

1. **Never** print, quote, or repeat secret values (API keys, JWT secrets, DB passwords, tokens).
2. Confirm presence only: `GEMINI_API_KEY is set` / `not set` — never the value.
3. Examples and docs use placeholders only (`YOUR_GEMINI_API_KEY`, `mysql://USER:PASS@host/db`).
4. If a secret appears in tool output, **redact** before answering and tell the user to **rotate**.
5. Frontend never gets server secrets or Gemini keys.
6. Do not commit `.env` or real credentials; use `.env.example` with empty placeholders.

## Workflow when touching config

1. Prefer editing variable *names* and validation logic, not pasting live values.
2. Run MCP `secrets_policy` or `secret_exposure_scan` if available.
3. If a leak is found in git: warn, redact in chat, recommend rotation + history cleanup (only force-push if user asks).

## Redaction patterns

- Keys: `AIza***`, `sk-***`, `eyJ***` (JWTs)
- URLs: `mysql+pymysql://***:***@host:3306/db`
- Generic: `***REDACTED***`
