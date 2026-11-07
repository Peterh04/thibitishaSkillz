"""Startup data: skill catalog and an optional admin account."""

from sqlalchemy.orm import Session

from backend.auth import hash_password
from backend.config import settings
from backend.models import Skill, User, UserRole
from backend.utils import skill_name_key

DEFAULT_SKILLS = [
    ("Python", "Programming", "General-purpose programming used for web, data, and automation."),
    ("JavaScript", "Programming", "Language of the web, used in browsers and on the server."),
    ("TypeScript", "Programming", "Typed JavaScript used for larger applications."),
    ("Java", "Programming", "Widely used language for backend and enterprise systems."),
    ("SQL", "Data", "Query language for relational databases."),
    ("React", "Programming", "Library for building user interfaces."),
    ("Node.js", "Programming", "JavaScript runtime for server-side applications."),
    ("FastAPI", "Programming", "Python framework for building APIs."),
    ("Django", "Programming", "Python web framework."),
    ("HTML", "Programming", "Markup language for web pages."),
    ("CSS", "Programming", "Style language for web pages."),
    ("Git", "Tools", "Version control system."),
    ("Data Analysis", "Data", "Inspecting and interpreting data to support decisions."),
    ("Machine Learning", "Data", "Building models that learn from data."),
    ("Excel", "Data", "Spreadsheets for analysis and reporting."),
    ("Cybersecurity", "Security", "Protecting systems, networks, and data."),
    ("Networking", "Security", "How computers connect and communicate."),
    ("Communication", "Professional", "Explaining ideas clearly in speech and writing."),
    ("Project Management", "Professional", "Planning and delivering work with a team."),
    ("Problem Solving", "Professional", "Breaking down problems and choosing a sound approach."),
]


def seed_skills(db: Session) -> None:
    existing = {row[0] for row in db.query(Skill.name_key).all()}
    for name, category, description in DEFAULT_SKILLS:
        key = skill_name_key(name)
        if key in existing:
            continue
        db.add(Skill(name=name, name_key=key, category=category, description=description))
    db.commit()


def seed_admin(db: Session) -> None:
    email = settings.ADMIN_EMAIL.strip().lower()
    password = settings.ADMIN_PASSWORD
    if not email or not password:
        return
    if db.query(User).filter(User.email == email).first():
        return
    if len(password) < 8:
        return
    db.add(
        User(
            full_name=settings.ADMIN_NAME.strip() or "Platform Admin",
            email=email,
            password_hash=hash_password(password),
            role=UserRole.admin,
            is_active=True,
        )
    )
    db.commit()


def get_or_create_skill(db: Session, name: str, category: str | None = None, description: str | None = None) -> Skill:
    key = skill_name_key(name)
    skill = db.query(Skill).filter(Skill.name_key == key).first()
    if skill:
        return skill
    display_name = " ".join(part.capitalize() if part.islower() else part for part in name.strip().split())
    skill = Skill(
        name=display_name[:80],
        name_key=key,
        category=(category or "General")[:80],
        description=(description or None),
    )
    db.add(skill)
    db.flush()
    return skill
