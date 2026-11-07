"""Add voice interview tables for MsingiAI spoken interviewer.

Revision ID: 002_voice_interviews
Revises: 001_initial_schema
Create Date: 2026-11-07 15:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002_voice_interviews"
down_revision: Union[str, None] = "001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "voice_interviews",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("candidate_id", sa.Integer(), nullable=False),
        sa.Column("skill_id", sa.Integer(), nullable=True),
        sa.Column("cv_id", sa.Integer(), nullable=True),
        sa.Column("language", sa.String(length=16), nullable=False, server_default="sw"),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("total_questions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("percentage", sa.Float(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["candidate_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["skill_id"], ["skills.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["cv_id"], ["cvs.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_voice_interviews_id"), "voice_interviews", ["id"], unique=False)
    op.create_index(
        op.f("ix_voice_interviews_candidate_id"), "voice_interviews", ["candidate_id"], unique=False
    )
    op.create_index(op.f("ix_voice_interviews_skill_id"), "voice_interviews", ["skill_id"], unique=False)
    op.create_index(op.f("ix_voice_interviews_cv_id"), "voice_interviews", ["cv_id"], unique=False)
    op.create_index(op.f("ix_voice_interviews_status"), "voice_interviews", ["status"], unique=False)

    op.create_table(
        "voice_interview_turns",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("interview_id", sa.Integer(), nullable=False),
        sa.Column("turn_index", sa.Integer(), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("question_text_en", sa.Text(), nullable=True),
        sa.Column("question_audio_path", sa.String(length=500), nullable=True),
        sa.Column("answer_audio_path", sa.String(length=500), nullable=True),
        sa.Column("transcript", sa.Text(), nullable=True),
        sa.Column("awarded_marks", sa.Integer(), nullable=True),
        sa.Column("max_marks", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column("answered_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["interview_id"], ["voice_interviews.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("interview_id", "turn_index", name="uq_voice_interview_turn"),
    )
    op.create_index(op.f("ix_voice_interview_turns_id"), "voice_interview_turns", ["id"], unique=False)
    op.create_index(
        op.f("ix_voice_interview_turns_interview_id"),
        "voice_interview_turns",
        ["interview_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_table("voice_interview_turns")
    op.drop_table("voice_interviews")
