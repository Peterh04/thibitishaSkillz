"""Add SMS notification audit log for ThriveVas stage alerts.

Revision ID: 003_sms_notification_logs
Revises: 002_voice_interviews
Create Date: 2026-11-07 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003_sms_notification_logs"
down_revision: Union[str, None] = "002_voice_interviews"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "sms_notification_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("event_key", sa.String(length=80), nullable=False),
        sa.Column("recipient_role", sa.String(length=32), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("to_msisdn", sa.String(length=20), nullable=True),
        sa.Column("body_preview", sa.String(length=160), nullable=True),
        sa.Column("related_type", sa.String(length=40), nullable=True),
        sa.Column("related_id", sa.Integer(), nullable=True),
        sa.Column("provider", sa.String(length=40), nullable=False, server_default="thrivevas"),
        sa.Column("provider_message_id", sa.String(length=120), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("error_detail", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_sms_notification_logs_id"), "sms_notification_logs", ["id"], unique=False)
    op.create_index(
        op.f("ix_sms_notification_logs_event_key"), "sms_notification_logs", ["event_key"], unique=False
    )
    op.create_index(
        op.f("ix_sms_notification_logs_user_id"), "sms_notification_logs", ["user_id"], unique=False
    )
    op.create_index(
        op.f("ix_sms_notification_logs_status"), "sms_notification_logs", ["status"], unique=False
    )


def downgrade() -> None:
    op.drop_table("sms_notification_logs")
