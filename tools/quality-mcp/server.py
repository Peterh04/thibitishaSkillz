#!/usr/bin/env python3
"""Thibitisha Quality MCP — security, architecture, DB, and senior-code gates.

Run (stdio):
  python tools/quality-mcp/server.py

Configured for Cursor via .cursor/mcp.json
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = ROOT / ".cursor" / "skills" / "company-production-gate" / "scripts"
sys.path.insert(0, str(SCRIPTS))

from audit_scan import Finding, format_text, scan  # noqa: E402

try:
    from mcp.server.fastmcp import FastMCP
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "Missing dependency: pip install -r tools/quality-mcp/requirements.txt\n"
        f"Original error: {exc}"
    ) from exc

mcp = FastMCP(
    "thibitisha-quality",
    instructions=(
        "Company production gate for Thibitisha Skills. "
        "Use these tools before implementing features and when auditing security or readiness. "
        "Act as a senior engineer, AppSec reviewer, experienced MySQL DBA, AND a senior product designer / frontend engineer. "
        "Optimize for the hackathon judging rubric (100 pts): Problem 15, Data 10, SE 25, Validation 15, Demand 10, Deploy 15, Presentation 10. "
        "Prefer a focused working MVP with evidence over unfinished complexity. Disclose and validate AI usage. "
        "Call judging_scorecard when prioritizing work. "
        "Never ship tutorial-grade code or AI-slop UI; remediate with production-ready, sophisticated designs. "
        "FRONTEND: No Vite scaffold leftovers, no purple-gradient Inter template looks, no generic card/pill/stat slop. "
        "Ship brand-led, accessible, human-crafted UI with real seeker/employer flows, loading/empty/error states, and a clean React architecture. "
        "Before UI work call frontend_design_bar and frontend_audit; redesign until it passes a human senior bar. "
        "CRITICAL SECRETS POLICY: Never reveal, quote, echo, or write into chat any API keys, "
        "JWT secrets, database passwords, access tokens, .env values, private keys, or password hashes. "
        "Only report whether a secret appears to be set or missing. "
        "If a secret is found in files or tool output, redact it (***REDACTED***) and instruct the user to rotate. "
        "Never put Gemini keys or server secrets in frontend code. "
        "Call secrets_policy at session start when working on config/auth, and secret_exposure_scan before commits involving env/config."
    ),
)


def _filter(findings: list[Finding], categories: set[str] | None = None, min_severity: str | None = None) -> list[Finding]:
    order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
    min_rank = order.get(min_severity or "info", 4)
    out = []
    for f in findings:
        if categories and f.category not in categories:
            continue
        if order.get(f.severity, 99) > min_rank:
            continue
        out.append(f)
    return out


@mcp.tool()
def security_audit(min_severity: str = "info") -> str:
    """Run security-focused static checks on the Thibitisha repo (auth, secrets, uploads, AI, CORS)."""
    findings = _filter(scan(ROOT), categories={"security", "secrets"}, min_severity=min_severity)
    if not findings:
        return "No security findings at this severity threshold."
    return format_text(findings)


@mcp.tool()
def architecture_gaps(min_severity: str = "info") -> str:
    """Find architecture and packaging gaps (entrypoint, deps, missing routes, CI/tests)."""
    findings = _filter(
        scan(ROOT),
        categories={"architecture", "quality", "ops"},
        min_severity=min_severity,
    )
    if not findings:
        return "No architecture/ops findings at this severity threshold."
    return format_text(findings)


@mcp.tool()
def database_audit(min_severity: str = "info") -> str:
    """Audit database engineering posture (migrations, constraints, pool settings)."""
    findings = _filter(scan(ROOT), categories={"database"}, min_severity=min_severity)
    if not findings:
        return "No database findings at this severity threshold."
    return format_text(findings)


@mcp.tool()
def full_readiness_report() -> str:
    """Full company-readiness report: security + architecture + database + frontend + quality."""
    return format_text(scan(ROOT))


@mcp.tool()
def frontend_audit(min_severity: str = "info") -> str:
    """Audit the React/Vite frontend for scaffold leftovers, API gaps, a11y, UX states, and AI-slop UI patterns."""
    findings = _filter(scan(ROOT), categories={"frontend"}, min_severity=min_severity)
    if not findings:
        return "No frontend findings at this severity threshold."
    return format_text(findings)


@mcp.tool()
def frontend_design_bar() -> str:
    """Mandatory UI/UX bar: senior human craft, anti-slop, sophisticated product design for Thibitisha."""
    return """# Frontend design & code bar (mandatory)

You are a senior product designer + staff frontend engineer shipping a hiring platform companies will trust.

## Never ship (AI slop)
- Purple/indigo gradient themes, neon glow, generic glass cards
- Inter/Roboto/Arial/system as the brand voice
- Pill chip clusters, fake stats, emoji decoration, dashboard crammed into the hero
- Vite “Get started / Count is” scaffold on product routes
- Component-gallery layouts with no brand or narrative

## Do ship
- Distinct Thibitisha visual direction via CSS variables (color, type, space, motion)
- Expressive typography; atmospheric backgrounds; real imagery
- First viewport = one composition: brand, headline, support, CTAs, dominant visual
- One job per section; 2–3 intentional motions; reduced-motion safe
- Seeker & employer flows that feel considered end-to-end
- React structure: routes, features, shared API client, layouts — not one App.jsx blob
- Loading / empty / error / success on every data view
- Accessible labels, focus, keyboard paths for auth, apply, assessment

## Quality test
If removing the logo would make the UI look like any other AI SaaS template, redesign it.
Call frontend_audit after substantive UI work and fix Critical/High before claiming done.
"""


@mcp.tool()
def senior_engineering_bar() -> str:
    """Return the mandatory senior/company coding bar the agent must follow while working on this repo."""
    return """# Senior / company engineering bar (mandatory)

You are staffing this as a production hiring product for real companies.

## Roles to emulate
- Staff backend engineer (FastAPI)
- AppSec engineer
- MySQL DBA with years of production experience
- Senior product designer + staff frontend engineer (no AI-slop UI)
- Product engineer who cares about failure modes

## Secrets (non-negotiable)
- NEVER expose API keys, JWT secrets, DB passwords, tokens, or raw .env values in chat, commits, logs, docs, or error messages.
- Confirm set/missing only. Redact leaks. Tell the user to rotate compromised secrets.
- Placeholders only in examples. Frontend never receives server secrets or Gemini keys.

## Backend code quality
- No tutorial/demo shortcuts.
- Explicit validation, authz, error mapping, and transactions.
- Prefer services over fat routes; typed schemas; stable HTTP semantics.
- Secrets only from environment; fail closed in production configs.
- DB: constraints, indexes, migrations (Alembic), no N+1 on hot paths.
- AI: fence untrusted input; schema-validate model JSON; never trust scores from the model for totals when marks are local.

## Frontend code quality
- Sophisticated React architecture and human-crafted UI (see frontend_design_bar).
- No scaffold leftovers; brand-led design; full async UX states; a11y.

## Before writing code
1. Call full_readiness_report or the relevant audit tool if touching a sensitive area.
2. For UI: frontend_design_bar + frontend_audit first.
3. Call secrets_policy / secret_exposure_scan when touching config, auth, or env.
4. Design for abuse cases (replay, IDOR, brute force, prompt injection, oversized upload).
5. Implement the secure, polished path first; document residual gaps.

## Remediation style
Ship mergeable, advanced implementations — not pseudocode, not template UI, not "you should" lists when asked to build.
"""


@mcp.tool()
def secrets_policy() -> str:
    """Mandatory policy: do not expose keys, tokens, passwords, or .env contents. Call before config/auth work."""
    return """# Secrets policy (mandatory for this MCP + project)

## Never expose
- Gemini / cloud / email / payment API keys
- JWT_SECRET_KEY and signing keys
- DATABASE_URL passwords and connection strings with credentials
- Access tokens, refresh tokens, session cookies
- Password hashes, OTPs, private keys, .env file contents
- Full CV text or bulk PII in chat replies

## Allowed
- Say a variable is set or missing
- Use placeholders: YOUR_GEMINI_API_KEY, mysql://USER:PASS@host/db
- Redact: AIza***, sk-***, eyJ***, ***REDACTED***

## If exposed
1. Do not repeat the value
2. Tell the user to rotate immediately
3. Remove from git if committed (coordinate; no force-push unless asked)

## Engineering
- Secrets from env/secret manager only
- .env gitignored; .env.example with empty placeholders
- No server secrets in frontend
- Logs/errors must not include Authorization headers, tokens, or connection strings
"""


@mcp.tool()
def secret_exposure_scan() -> str:
    """Scan the repo for likely committed secrets, .env files, and hardcoded credentials (values redacted in output)."""
    findings = _filter(scan(ROOT), categories={"security", "secrets"}, min_severity="info")
    secret_related = [
        f
        for f in findings
        if f.category == "secrets"
        or "secret" in f.title.lower()
        or "credential" in f.title.lower()
        or "jwt" in f.title.lower()
        or ".env" in f.title.lower()
        or "password" in f.title.lower()
        or "api key" in f.title.lower()
    ]
    # Re-scan with dedicated secret heuristics via scan(); also run extra file checks here
    extra = _secret_file_findings()
    combined = secret_related + extra
    if not combined:
        return (
            "No obvious secret-exposure findings in the static scan.\n"
            "Still: never paste .env values into chat; keep using placeholders."
        )
    # Deduplicate by title
    seen = set()
    unique = []
    for f in combined:
        if f.title in seen:
            continue
        seen.add(f.title)
        unique.append(f)
    return format_text(unique)


def _secret_file_findings() -> list[Finding]:
    """Additional secret-oriented filesystem checks; never include raw secret values."""
    findings: list[Finding] = []
    env_files = list(ROOT.glob("**/.env")) + list(ROOT.glob("**/.env.*"))
    env_files = [p for p in env_files if p.is_file() and ".venv" not in p.parts and "node_modules" not in p.parts]
    tracked_env = [p for p in env_files if ".example" not in p.name.lower()]
    if tracked_env:
        import subprocess

        names = ", ".join(str(p.relative_to(ROOT)) for p in tracked_env[:10])
        ignored = True
        try:
            for p in tracked_env:
                res = subprocess.run(
                    ["git", "check-ignore", "-q", str(p.relative_to(ROOT))],
                    cwd=ROOT,
                    check=False,
                )
                if res.returncode != 0:
                    ignored = False
                    break
        except OSError:
            ignored = False
        findings.append(
            Finding(
                "info" if ignored else "critical",
                "secrets",
                "dotenv file present in workspace",
                names + (" (gitignored)" if ignored else " (NOT gitignored)"),
                "OK if gitignored; critical if trackable — credentials must never be committed",
                "Keep .env gitignored; never paste contents into chat; use .env.example with empty placeholders",
            )
        )

    dangerous_patterns = [
        (re.compile(r"AIza[0-9A-Za-z\-_]{20,}"), "Google-style API key pattern"),
        (re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"), "Private key block"),
        (re.compile(r"(?i)(api[_-]?key|secret[_-]?key|password)\s*=\s*['\"][^'\"]{12,}['\"]"), "Hardcoded credential assignment"),
    ]
    # import re at function needs module level - add import
    skip_parts = {".venv", "node_modules", ".git", "dist", "__pycache__"}
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        if any(part in skip_parts for part in path.parts):
            continue
        if path.suffix.lower() not in {".py", ".js", ".jsx", ".ts", ".tsx", ".env", ".json", ".yml", ".yaml", ".md", ".txt", ".toml"}:
            continue
        if path.name.endswith(".example") or path.name == ".env.example":
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        # Skip our own scanner/docs mentioning patterns
        rel = str(path.relative_to(ROOT))
        if rel.startswith("tools/quality-mcp") or rel.startswith(".cursor/skills"):
            continue
        # Documentation placeholders are not live secrets
        if path.suffix.lower() == ".md":
            continue
        for pattern, label in dangerous_patterns:
            if pattern.search(text):
                findings.append(
                    Finding(
                        "critical",
                        "secrets",
                        f"Possible secret material: {label}",
                        rel,
                        "Credential may be recoverable from the repository or chat context",
                        "Remove the value, use env vars, rotate the credential, redact in any logs/chat",
                    )
                )
                break
    return findings


@mcp.tool()
def judging_rubric() -> str:
    """Full hackathon judging rubric with points, principles, and tie-breakers. Use before planning or pitching."""
    path = ROOT / ".cursor" / "skills" / "hackathon-judging" / "RUBRIC.md"
    if path.is_file():
        return path.read_text(encoding="utf-8")
    return "Rubric file missing. See always-on rule hackathon-judging-rubric."


@mcp.tool()
def judging_scorecard() -> str:
    """Evidence-based self-score against the 100-point rubric; lists gaps that cost the most points first."""
    findings = scan(ROOT)
    by_cat: dict[str, list[Finding]] = {}
    for f in findings:
        by_cat.setdefault(f.category, []).append(f)

    def has_critical(*cats: str) -> bool:
        return any(f.severity == "critical" for c in cats for f in by_cat.get(c, []))

    def has_high(*cats: str) -> bool:
        return any(f.severity == "high" for c in cats for f in by_cat.get(c, []))

    readme = (ROOT / "README.md").read_text(encoding="utf-8", errors="replace") if (ROOT / "README.md").exists() else ""
    has_demo_docs = any(
        (ROOT / name).exists()
        for name in ("DEMO.md", "docs/DEMO.md", "PRESENTATION.md", "PITCH.md")
    )
    def _project_tests() -> bool:
        if (ROOT / "tests").is_dir():
            return True
        for pattern in ("**/test_*.py", "**/*_test.py"):
            for path in ROOT.glob(pattern):
                if any(part in {".venv", "node_modules", ".git"} for part in path.parts):
                    continue
                return True
        return False

    has_tests = _project_tests()
    has_frontend_product = not any(
        f.title.startswith("Vite starter") or f.title.startswith("No Thibitisha product")
        for f in by_cat.get("frontend", [])
    )
    has_entrypoint = not any("entrypoint" in f.title.lower() for f in by_cat.get("architecture", []))
    has_limitations_doc = any(
        word in readme.lower() for word in ("limitation", "assumption", "ai usage", "gemini")
    )

    # Heuristic scores (1-5) — evidence-based, intentionally conservative
    rows = []

    # 1 Problem 15
    p_users = 4  # product concept is clear in backend domain
    p_relevance = 5 if has_frontend_product else 3
    p_context = 4
    rows.append(("1. Problem Understanding & Relevance", 15, [
        ("Problem + target users", 5, p_users, "Document seekers vs employers + verification pain in README/pitch"),
        ("Solution relevance", 5, p_relevance, "Ship CV→assess→verify→match/apply UI end-to-end"),
        ("Causes/constraints/context", 5, p_context, "Spell out CV fraud, AI trust limits, publish gates"),
    ]))

    # 2 Data 10
    d_sources = 4 if (ROOT / "backend" / "models.py").exists() else 2
    d_quality = 4 if not has_critical("secrets") else 3
    d_signal = 4  # matching + verification exist in backend
    d_interp = 4
    if has_high("database"):
        d_sources = min(d_sources, 3)
    rows.append(("2. Data Quality, Analysis & Signal", 10, [
        ("Data sources & understanding", 3, d_sources, "Explain schema + which fields drive matching"),
        ("Cleaning / data quality", 2, d_quality, "Keep PDF checks, schema validation; fix secret/config defaults"),
        ("Meaningful signals / features", 3, d_signal, "Demo verified scores, match weights, leaderboard"),
        ("Interpretation of findings", 2, d_interp, "Document pass %, level caps, is_current semantics"),
    ]))

    # 3 SE 25
    se_func = 2 if has_critical("frontend", "architecture") else (3 if has_high("frontend", "architecture") else 4)
    se_arch = 2 if not has_entrypoint else 4
    se_code = 4  # backend modular
    se_ux = 1 if not has_frontend_product else 3
    if has_critical("frontend"):
        se_ux = 1
    rows.append(("3. Software Engineering & Technical Execution", 25, [
        ("Working prototype completeness", 9, se_func, "Runnable API + real product UI for main journeys"),
        ("Architecture & tech choices", 6, se_arch, "Add FastAPI entrypoint, deps lock, migrations path"),
        ("Code quality & modularity", 5, se_code, "Keep routes/services split; fix auth Depends bug"),
        ("UX / usability / UI craft", 5, se_ux, "Replace Vite scaffold; senior anti-slop UI"),
    ]))

    # 4 Validation 15
    v_test = 2 if not has_tests else 4
    v_evidence = 2 if not has_demo_docs else 4
    v_metrics = 3
    v_limits = 3 if has_limitations_doc else 2
    rows.append(("4. Validation, Testing & Evidence", 15, [
        ("Functional / system testing", 4, v_test, "Add pytest for auth, scoring, matching, authz negatives"),
        ("Evidence of effectiveness", 5, v_evidence, "DEMO.md with seeker + employer scripts + screenshots"),
        ("Metrics & interpretation", 4, v_metrics, "Show pass rates, match scores, workflow success in demo"),
        ("Limitations & failure cases", 2, v_limits, "Name scanned PDFs, Gemini downtime, private profiles"),
    ]))

    # 5 Demand 10
    rows.append(("5. Proof of Demand & Practical Impact", 10, [
        ("Evidence of user need", 4, 3, "Add short user/stakeholder quotes or hiring-process pain notes"),
        ("Improves existing process", 3, 4, "Contrast CV-only hiring vs verified skills in pitch"),
        ("Feasibility / scale / sustain", 3, 3, "Deploy story + ops checklist (env, backups, rate limits)"),
    ]))

    # 6 Deploy 15
    deploy_usable = 1 if has_critical("frontend", "architecture") else 3
    deploy_link = 2  # no evidence of live deploy in repo scan
    deploy_reliable = 2 if has_high("security", "frontend") else 3
    deploy_polish = 2
    rows.append(("6. Relevance & Readiness to Deploy", 15, [
        ("Usable today without the team", 5, deploy_usable, "Live or local one-command run + clear .env.example"),
        ("Deployed or deployable", 4, deploy_link, "Public URL or deploy docs (Render/Fly/etc.) with config handled"),
        ("Reliable main path", 3, deploy_reliable, "Error handling on auth/CV/assess/apply; no crash demos"),
        ("Relevant now + named polish list", 3, deploy_polish, "Short MUST-FIX vs NICE list with hours/days"),
    ]))

    # 7 Presentation 10
    rows.append(("7. Presentation, Communication & Transparency", 10, [
        ("Problem & solution clarity", 3, 3 if readme else 2, "README + pitch: problem, users, solution"),
        ("Effective prototype demo", 3, 2 if not has_frontend_product else 3, "Rehearse end-to-end demo without workarounds"),
        ("Tech decisions & results", 2, 3, "Explain FastAPI/MySQL/Gemini/matching briefly"),
        ("Limitations & AI transparency", 2, 2 if not has_limitations_doc else 4, "Disclose Gemini uses + how outputs are validated"),
    ]))

    lines = [
        "## Judging scorecard (evidence-based estimate)",
        "Scale per sub-criterion: 1 Poor … 5 Excellent. Caps = max points for that row.",
        "This is a self-assessment aid for prioritization — not the judges' official score.",
        "",
    ]
    total_est = 0.0
    total_max = 0
    gaps: list[tuple[int, str, str]] = []

    for section, section_max, items in rows:
        lines.append(f"### {section} ({section_max} pts)")
        section_pts = 0.0
        for name, cap, rating, fix in items:
            rating = max(1, min(5, int(rating)))
            pts = round(cap * (rating / 5), 2)
            section_pts += pts
            lines.append(f"- **{name}**: {rating}/5 → ~{pts}/{cap} pts")
            if rating < 5:
                gaps.append((cap - pts, name, fix))
        total_est += section_pts
        total_max += section_max
        lines.append(f"  Subtotal ≈ **{section_pts:.1f}/{section_max}**")
        lines.append("")

    lines.append(f"## Estimated total ≈ **{total_est:.1f}/{total_max}**")
    lines.append("")
    lines.append("## Highest-value gaps (points left on the table)")
    gaps.sort(key=lambda g: -g[0])
    for left, name, fix in gaps[:12]:
        lines.append(f"- (~{left:.1f} pts) **{name}**: {fix}")
    lines.append("")
    lines.append("## Principles reminder")
    lines.append("- Focused working MVP > unfinished complexity")
    lines.append("- Evidence only — no unsupported claims")
    lines.append("- Disclose AI (Gemini) and how you validate it")
    lines.append("- Tie-break: more event tools → readiness → validation → SE → demand → real-world value")
    return "\n".join(lines)


@mcp.tool()
def review_change_guidance(area: str) -> str:
    """Get senior review guidance for a work area: auth | cv | assessments | jobs | database | frontend | admin | judging."""
    area_key = (area or "").strip().lower()
    guides = {
        "auth": [
            "Verify password hashing (bcrypt/argon2), JWT secret strength, revocation, inactive users.",
            "Rate-limit login/register; constant-time-ish failure messages; no user enumeration where avoidable.",
            "Admin must not be creatable via public register.",
        ],
        "cv": [
            "Magic-byte + size limits; store outside public web root; unique filenames.",
            "Do not trust Gemini skills without text support check.",
            "PII in extracted_text — access control on analysis endpoints.",
        ],
        "assessments": [
            "One open assessment per skill; daily caps; answer set must match question IDs.",
            "MC graded locally; written via Gemini with clamped marks; percentage from awarded/total.",
            "Verification is_current semantics and ranking recompute must stay consistent.",
        ],
        "jobs": [
            "Object-level authz: employers only manage own jobs.",
            "Matching uses verified scores only; document formula.",
            "Publish gates (company name, skills, location) must stay enforced.",
        ],
        "database": [
            "Alembic for every schema change; unique constraints for business keys.",
            "Indexes on filter/join columns; pool_pre_ping; least-privilege DB user in prod.",
            "No unbounded text in list queries.",
        ],
        "frontend": [
            "Call frontend_audit + frontend_design_bar before and after UI work.",
            "Replace Vite scaffold; brand-led anti-slop design; CSS tokens; expressive type.",
            "Routes + feature folders + shared API client; loading/empty/error states.",
            "Handle 401/403/429; never embed server secrets; accessible forms and keyboard paths.",
            "Seeker (CV→skills→assessment→apply) and employer (jobs→matches→applications) must feel product-complete.",
        ],
        "admin": [
            "require_roles(admin) on every admin route.",
            "No self-deactivate / self-role-change; audit log recommended for company deploy.",
        ],
        "judging": [
            "Call judging_scorecard and close highest points-left gaps first (SE, Validation, Deploy, Problem).",
            "Ship end-to-end seeker + employer demo paths before polish.",
            "Write README/DEMO with limitations and Gemini AI disclosure.",
            "Add tests + evidence; prefer deployable MVP over roadmap slides.",
        ],
    }
    if area_key not in guides:
        return (
            "Unknown area. Use one of: auth, cv, assessments, jobs, database, frontend, admin, judging.\n"
            "Then run the matching audit tool before implementing."
        )
    bullets = "\n".join(f"- {g}" for g in guides[area_key])
    return f"# Review guidance: {area_key}\n\n{bullets}\n\nAlso run the relevant MCP audit tool and fix Critical/High first."


if __name__ == "__main__":
    mcp.run(transport="stdio")
