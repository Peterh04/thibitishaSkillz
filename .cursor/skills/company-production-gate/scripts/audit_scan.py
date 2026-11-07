#!/usr/bin/env python3
"""Static production-readiness and security gap scanner for Thibitisha Skills.

Usage:
  python audit_scan.py --root /path/to/repo
  python audit_scan.py --root . --format json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable


SEVERITIES = ("critical", "high", "medium", "low", "info")


@dataclass
class Finding:
    severity: str
    category: str
    title: str
    evidence: str
    risk: str
    fix: str


def _read(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def _iter_py(root: Path) -> Iterable[Path]:
    backend = root / "backend"
    if not backend.is_dir():
        return []
    return [p for p in backend.rglob("*.py") if p.is_file()]


def _has_file(root: Path, *parts: str) -> bool:
    return (root.joinpath(*parts)).exists()


def scan(root: Path) -> list[Finding]:
    findings: list[Finding] = []
    backend = root / "backend"
    py_files = list(_iter_py(root))
    all_py = "\n".join(_read(p) for p in py_files)
    config = _read(backend / "config.py")
    models = _read(backend / "models.py")
    auth = _read(backend / "auth.py")
    deps = _read(backend / "dependencies.py")

    # --- App bootstrap / packaging ---
    entrypoints = (
        "main.py",
        "app.py",
        "backend/main.py",
        "backend/app.py",
        "backend/fastapi.py",
    )
    if not any(_has_file(root, *name.split("/")) if "/" in name else _has_file(root, name) for name in entrypoints):
        findings.append(
            Finding(
                "critical",
                "architecture",
                "No FastAPI application entrypoint",
                "Missing main.py / app.py / backend/fastapi.py that creates FastAPI(), mounts routers, CORS, lifespan",
                "The API package cannot be run or deployed as a service",
                "Add backend/fastapi.py (or app factory) with router includes, CORS from settings, create_all/seed on startup for local only",
            )
        )
    elif _has_file(root, "backend", "fastapi.py"):
        findings.append(
            Finding(
                "info",
                "architecture",
                "FastAPI entrypoint present",
                "backend/fastapi.py",
                "N/A — positive control",
                "Run via: uvicorn backend.fastapi:app --reload --app-dir .",
            )
        )

    if not any(
        _has_file(root, name)
        for name in ("requirements.txt", "pyproject.toml", "Pipfile", "backend/requirements.txt", "backend/pyproject.toml")
    ):
        findings.append(
            Finding(
                "high",
                "architecture",
                "No Python dependency lock/manifest",
                "No requirements.txt or pyproject.toml at repo/backend root",
                "Non-reproducible installs; unknown vulnerable dependency versions",
                "Add pyproject.toml or requirements.txt with pinned versions; generate a lockfile for deploys",
            )
        )

    if not list(root.glob("**/alembic.ini")) and not list((backend / "migrations").glob("**/*") if (backend / "migrations").exists() else []):
        findings.append(
            Finding(
                "high",
                "database",
                "No migration framework detected",
                "No alembic.ini or backend/migrations",
                "Schema drift between environments; unsafe production changes",
                "Introduce Alembic; forbid create_all as the production migration path",
            )
        )

    # --- Secrets / config ---
    jwt_has_weak_default = bool(
        re.search(
            r'JWT_SECRET_KEY\s*:\s*str\s*=\s*"(change-this|replace-this)[^"]*"',
            config,
        )
    )
    jwt_required = bool(
        re.search(r"JWT_SECRET_KEY\s*:\s*str\s*=\s*Field\s*\(\s*\.\.\.", config)
    )
    if jwt_has_weak_default:
        findings.append(
            Finding(
                "critical",
                "secrets",
                "Default JWT secret in settings",
                "backend/config.py JWT_SECRET_KEY default (value not shown)",
                "Anyone who knows the default can forge tokens and impersonate users",
                "Require JWT_SECRET_KEY from environment in non-dev; fail startup if missing/weak in production",
            )
        )
    elif jwt_required:
        findings.append(
            Finding(
                "info",
                "secrets",
                "JWT secret required from environment",
                "backend/config.py JWT_SECRET_KEY has no weak code default",
                "N/A — positive control",
                "Keep rotating secrets out of band; never commit backend/.env",
            )
        )

    if "root:password@localhost" in config:
        findings.append(
            Finding(
                "high",
                "secrets",
                "Default database credentials in settings",
                "DATABASE_URL default embeds a local password placeholder (value not echoed)",
                "Accidental production use with weak DB auth",
                "No default password in code; require DATABASE_URL from env; use least-privilege DB user",
            )
        )
    elif "DATABASE_URL: str = Field" in config:
        findings.append(
            Finding(
                "info",
                "secrets",
                "DATABASE_URL required from environment",
                "backend/config.py DATABASE_URL has no weak code default",
                "N/A — positive control",
                "Use least-privilege DB users in shared/cloud environments",
            )
        )

    gitignore = _read(root / ".gitignore")
    if gitignore and ".env" not in gitignore:
        findings.append(
            Finding(
                "high",
                "secrets",
                ".env not listed in .gitignore",
                ".gitignore",
                "Local credentials can be committed accidentally",
                "Add .env and .env.* (except .env.example) to .gitignore",
            )
        )

    if not _has_file(root, ".env.example") and not _has_file(root, "backend", ".env.example"):
        findings.append(
            Finding(
                "medium",
                "secrets",
                "No .env.example with placeholders",
                "repo root / backend",
                "Developers may share real .env files instead of a safe template",
                "Add .env.example with empty placeholder values only — never real keys",
            )
        )

    # Hardcoded key-looking assignments in backend (do not capture groups into evidence)
    if re.search(r"(?i)(GEMINI_API_KEY|API_KEY|SECRET_KEY)\s*=\s*['\"][A-Za-z0-9_\-]{16,}['\"]", all_py):
        findings.append(
            Finding(
                "critical",
                "secrets",
                "Possible hardcoded API/secret key assignment in Python",
                "backend/**/*.py (pattern match; value redacted)",
                "Keys in source are leaked via git and chat context",
                "Move to environment variables; rotate any key that was committed",
            )
        )

    if re.search(r'CORS_ORIGINS: str = "\*"', config) or 'allow_origins=["*"]' in all_py:
        findings.append(
            Finding(
                "high",
                "security",
                "Overly permissive CORS",
                "Wildcard CORS detected or configured",
                "Browser-based token theft / CSRF-like abuse depending on auth design",
                "Allowlist exact frontend origins from settings.cors_origins",
            )
        )

    # --- Auth / crypto ---
    if "bcrypt" not in auth and "pwd_context" not in auth:
        findings.append(
            Finding(
                "critical",
                "security",
                "Password hashing not clearly using bcrypt/argon2",
                "backend/auth.py",
                "Weak or custom password storage",
                "Use passlib/bcrypt or argon2id with proper work factor",
            )
        )

    if "RevokedToken" in deps and "revoke" in deps.lower():
        findings.append(
            Finding(
                "info",
                "security",
                "Token revocation path present",
                "dependencies.revoke_token / RevokedToken",
                "N/A — positive control",
                "Ensure logout is used client-side and revoked table is pruned",
            )
        )
    else:
        findings.append(
            Finding(
                "medium",
                "security",
                "No token revocation detected",
                "dependencies/auth",
                "Stolen tokens remain valid until expiry",
                "Add jti denylist or short-lived access + refresh rotation",
            )
        )

    if "rate" not in all_py.lower() and "slowapi" not in all_py.lower() and "RateLimit" not in all_py:
        findings.append(
            Finding(
                "high",
                "security",
                "No application-level rate limiting found",
                "backend/**/*.py",
                "Brute-force login, assessment spam, Gemini cost abuse",
                "Add SlowAPI or gateway limits on /auth/login, /cv/upload, /assessments/start, /cv/*/analyze",
            )
        )

    # --- Injection / query safety ---
    if re.search(r'execute\([f"\'].*\{', all_py) or "text(f\"" in all_py:
        findings.append(
            Finding(
                "critical",
                "security",
                "Possible dynamic SQL string building",
                "Pattern matching f-string/SQL in backend",
                "SQL injection",
                "Use bound parameters only; never interpolate user input into SQL",
            )
        )

    # --- Uploads ---
    cv_service = _read(backend / "services" / "cv_service.py")
    if "PdfReader" in cv_service and "%PDF" in cv_service:
        findings.append(
            Finding(
                "info",
                "security",
                "PDF magic-byte check present",
                "cv_service.extract_pdf_text",
                "N/A — positive control",
                "Still consider AV scanning and storing outside public URL space in company deploy",
            )
        )
    if "MAX_CV_SIZE" not in config and "max_cv_bytes" not in config:
        findings.append(
            Finding(
                "medium",
                "security",
                "CV size limit not obvious in config",
                "config.py",
                "DoS via large uploads",
                "Enforce MAX_CV_SIZE_MB at reverse proxy and app",
            )
        )

    # --- AI safety ---
    gemini = _read(backend / "services" / "gemini_service.py")
    if "_fence" in gemini and "untrusted" in gemini.lower():
        findings.append(
            Finding(
                "info",
                "security",
                "AI prompt fencing for untrusted content",
                "gemini_service._fence / SYSTEM_INSTRUCTION",
                "N/A — positive control",
                "Keep validating model JSON with Pydantic; never exec model output",
            )
        )
    elif "genai" in gemini or "gemini" in gemini.lower():
        findings.append(
            Finding(
                "high",
                "security",
                "Gemini integration without clear prompt-injection defenses",
                "backend/services/gemini_service.py",
                "Prompt injection / instruction override via CV or answers",
                "Fence untrusted text; system instruction; schema validation",
            )
        )

    # --- AuthZ patterns ---
    if "require_roles" not in deps:
        findings.append(
            Finding(
                "critical",
                "security",
                "Role dependency helper missing",
                "backend/dependencies.py",
                "Routes may be unprotected",
                "Centralize require_roles and apply to every mutating privileged route",
            )
        )

    apps = _read(backend / "routes" / "applications.py")
    if "get_db and require_roles" in apps:
        findings.append(
            Finding(
                "high",
                "security",
                "Suspicious Depends() expression in applications route",
                "routes/applications.py: get_db and require_roles(...)",
                "Auth dependency may not run as intended",
                "Use Depends(require_roles(...)) only — never boolean-and with get_db",
            )
        )

    # --- Employer profile gap ---
    users = _read(backend / "routes" / "users.py")
    employers = _read(backend / "routes" / "employers.py")
    schema = _read(backend / "schema.py")
    employer_route_ok = (
        "update_employer_profile" in employers
        or '"/profile"' in employers
        or "/employers/profile" in employers
    )
    if "EmployerProfileUpdate" in schema and not employer_route_ok:
        findings.append(
            Finding(
                "medium",
                "architecture",
                "Employer profile update schema without matching route",
                "schema.EmployerProfileUpdate vs routes/employers.py",
                "Employers cannot complete company profile → cannot publish jobs cleanly",
                "Add PUT /api/employers/profile with require_roles(employer)",
            )
        )

    # --- Database design signals ---
    if "UniqueConstraint" not in models:
        findings.append(
            Finding(
                "medium",
                "database",
                "Few or no UniqueConstraints in models",
                "backend/models.py",
                "Duplicate applications/skills under race",
                "Enforce business uniqueness in DB, not only in app checks",
            )
        )
    else:
        findings.append(
            Finding(
                "info",
                "database",
                "UniqueConstraints present on key joins",
                "candidate_skills, job_applications, etc.",
                "N/A — positive control",
                "Keep app IntegrityError handling aligned with constraints",
            )
        )

    if "pool_pre_ping" not in _read(backend / "database.py"):
        findings.append(
            Finding(
                "medium",
                "database",
                "DB pool_pre_ping not set",
                "backend/database.py",
                "Stale connections cause intermittent 500s",
                "Enable pool_pre_ping and pool_recycle",
            )
        )

    # --- Observability ---
    if "logging" not in all_py and "structlog" not in all_py:
        findings.append(
            Finding(
                "medium",
                "ops",
                "Little structured logging usage",
                "backend package",
                "Hard to debug production incidents / abuse",
                "Add request ID middleware and structured logs (no tokens/PII)",
            )
        )
    elif "logger" in gemini:
        findings.append(
            Finding(
                "info",
                "ops",
                "Logging present in Gemini service",
                "gemini_service.logger",
                "N/A",
                "Extend to auth failures, upload rejects, assessment lifecycle",
            )
        )

    # --- Tests / CI ---
    def _has_project_tests() -> bool:
        if (root / "tests").is_dir():
            return True
        for pattern in ("**/test_*.py", "**/*_test.py"):
            for path in root.glob(pattern):
                if any(part in {".venv", "node_modules", ".git"} for part in path.parts):
                    continue
                return True
        return False

    if not _has_project_tests():
        findings.append(
            Finding(
                "high",
                "quality",
                "No automated tests detected",
                "No tests/ or test_*.py",
                "Regressions in auth, scoring, and matching ship unnoticed",
                "Add pytest for auth, assessment scoring, matching math, and authz negatives",
            )
        )

    if not _has_file(root, ".github", "workflows") and not _has_file(root, ".gitlab-ci.yml"):
        findings.append(
            Finding(
                "medium",
                "ops",
                "No CI workflow detected",
                ".github/workflows or .gitlab-ci.yml missing",
                "Unchecked merges to main",
                "CI: lint, tests, dependency audit, migration check",
            )
        )

    findings.extend(_scan_frontend(root))

    # Sort by severity
    order = {s: i for i, s in enumerate(SEVERITIES)}
    findings.sort(key=lambda f: (order.get(f.severity, 99), f.category, f.title))
    return findings


def _iter_frontend_text(root: Path) -> Iterable[tuple[Path, str]]:
    frontend = root / "frontend"
    if not frontend.is_dir():
        return
    for path in frontend.rglob("*"):
        if not path.is_file():
            continue
        if "node_modules" in path.parts or "dist" in path.parts:
            continue
        if path.suffix.lower() not in {".js", ".jsx", ".ts", ".tsx", ".css", ".html"}:
            continue
        yield path, _read(path)


def _scan_frontend(root: Path) -> list[Finding]:
    findings: list[Finding] = []
    frontend = root / "frontend"
    if not frontend.is_dir():
        findings.append(
            Finding(
                "high",
                "frontend",
                "No frontend directory",
                "frontend/",
                "Product has no company UI surface",
                "Keep/maintain the Vite React app under frontend/ with real product routes",
            )
        )
        return findings

    app_jsx = _read(frontend / "src" / "App.jsx") + _read(frontend / "src" / "App.tsx")
    all_fe = "\n".join(text for _, text in _iter_frontend_text(root))
    css = "\n".join(
        text for path, text in _iter_frontend_text(root) if path.suffix.lower() == ".css"
    )

    if "Get started" in app_jsx or "Count is" in app_jsx or "Edit <code>src/App.jsx</code>" in app_jsx:
        findings.append(
            Finding(
                "critical",
                "frontend",
                "Vite starter scaffold still shipping as the app",
                "frontend/src/App.jsx",
                "Looks unfinished; not a company product UI",
                "Replace scaffold with real Thibitisha routes (auth, seeker, employer) and brand-led design",
            )
        )

    src = frontend / "src"
    has_router = any(
        token in all_fe
        for token in ("createBrowserRouter", "BrowserRouter", "react-router", "RouterProvider")
    )
    jsx_count = 0
    if src.is_dir():
        jsx_count = len(list(src.rglob("*.jsx"))) + len(list(src.rglob("*.tsx")))
    if not has_router and jsx_count <= 3:
        findings.append(
            Finding(
                "high",
                "frontend",
                "No routing / feature structure detected",
                "frontend/src",
                "Unmaintainable single-file app; cannot scale seeker/employer flows",
                "Add React Router and feature folders (auth, jobs, assessments, profile)",
            )
        )

    if "axios" not in all_fe and "/api/" not in all_fe and not re.search(
        r"\bfetch\s*\(", all_fe
    ):
        findings.append(
            Finding(
                "high",
                "frontend",
                "No backend API integration layer",
                "frontend/src",
                "UI cannot exercise auth, CV, assessments, or jobs",
                "Add a shared API client with auth header handling and typed error mapping",
            )
        )

    if "localStorage" in all_fe and any(tok in all_fe.lower() for tok in ("token", "jwt", "access_token")):
        findings.append(
            Finding(
                "medium",
                "frontend",
                "Auth token likely stored in localStorage",
                "frontend/src (token + localStorage)",
                "XSS can steal sessions more easily",
                "Prefer memory + httpOnly cookie strategy for company deploy; document interim risk if localStorage is temporary",
            )
        )

    slop_hits = []
    if re.search(r"font-family:\s*[^;]*(Inter|Roboto|Arial|system-ui)", css, re.I):
        slop_hits.append("default/system font stack as primary voice")
    if re.search(r"linear-gradient\([^)]*(#7c3aed|#8b5cf6|#6366f1|purple|indigo)", css, re.I):
        slop_hits.append("purple/indigo gradient aesthetic")
    if re.search(r"box-shadow:\s*[^;]*0 0 \d+px[^;]*(#|rgb|purple|violet)", css, re.I):
        slop_hits.append("glow-style shadows")
    if slop_hits:
        findings.append(
            Finding(
                "high",
                "frontend",
                "AI-slop visual patterns detected",
                "; ".join(slop_hits),
                "Generic AI UI; weak brand; not company-differentiated",
                "Define unique CSS variables, expressive fonts, and a deliberate Thibitisha visual direction — no purple-glow template look",
            )
        )

    if "--" not in css and "Get started" in app_jsx:
        findings.append(
            Finding(
                "medium",
                "frontend",
                "No design-token CSS variables for brand direction",
                "frontend CSS",
                "Inconsistent styling; hard to evolve a real design system",
                "Introduce :root tokens (color, type, space, radius, motion) owned by the product brand",
            )
        )

    a11y_weak = not any(
        token in all_fe for token in ("aria-", "role=", "htmlFor", "html-for", "<label")
    )
    if a11y_weak and "Get started" in app_jsx:
        findings.append(
            Finding(
                "medium",
                "frontend",
                "Little accessibility structure in UI code",
                "frontend/src",
                "Keyboard/screen-reader users blocked on core hiring flows",
                "Labels, focus states, landmarks, and meaningful alt text on primary flows",
            )
        )

    state_signals = ("loading", "isLoading", "error", "empty", "skeleton", "Spinner")
    if not any(sig in all_fe for sig in state_signals) and "Get started" in app_jsx:
        findings.append(
            Finding(
                "high",
                "frontend",
                "No loading/empty/error UX patterns",
                "frontend/src",
                "Feels broken under latency or API failure",
                "Standardize async UI states for every data-backed view",
            )
        )

    product_terms = ("assessment", "job", "employer", "seeker", "cv", "leaderboard", "login", "register")
    if not any(term in all_fe.lower() for term in product_terms):
        findings.append(
            Finding(
                "critical",
                "frontend",
                "No Thibitisha product surfaces in the UI",
                "frontend/src",
                "Frontend does not implement the product",
                "Build seeker and employer experiences against the backend API with senior UX craft",
            )
        )

    return findings


def format_text(findings: list[Finding]) -> str:
    counts = {s: 0 for s in SEVERITIES}
    for f in findings:
        counts[f.severity] = counts.get(f.severity, 0) + 1

    critical = counts["critical"]
    high = counts["high"]
    if critical:
        verdict = "Not ready for company production"
    elif high:
        verdict = "Partially ready — blockers remain"
    else:
        verdict = "Closer to company-ready — verify manual checklist"

    lines = [
        "## Readiness summary",
        f"Verdict: {verdict}",
        f"Critical: {counts['critical']} | High: {counts['high']} | Medium: {counts['medium']} | Low: {counts['low']} | Info: {counts['info']}",
        "",
        "## Findings",
    ]
    for f in findings:
        lines.extend(
            [
                f"### [{f.severity.upper()}] {f.title}",
                f"- Category: {f.category}",
                f"- Evidence: {f.evidence}",
                f"- Risk: {f.risk}",
                f"- Fix: {f.fix}",
                "",
            ]
        )
    return "\n".join(lines).rstrip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Thibitisha production readiness scanner")
    parser.add_argument("--root", default=".", help="Repository root")
    parser.add_argument("--format", choices=("text", "json"), default="text")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    findings = scan(root)
    if args.format == "json":
        print(json.dumps([asdict(f) for f in findings], indent=2))
    else:
        print(format_text(findings))
    # Exit 1 if critical/high so CI can gate
    if any(f.severity in {"critical", "high"} for f in findings):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
