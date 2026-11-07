"""Initial database schema for Thibitisha Skills

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-11-07 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('full_name', sa.String(length=150), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=32), nullable=False),
        sa.Column('profile_picture', sa.String(length=500), nullable=True),
        sa.Column('phone_number', sa.String(length=30), nullable=True),
        sa.Column('location', sa.String(length=150), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_role'), 'users', ['role'], unique=False)

    # 2. candidate_profiles
    op.create_table(
        'candidate_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('education', sa.Text(), nullable=True),
        sa.Column('experience_summary', sa.Text(), nullable=True),
        sa.Column('career_interests', sa.Text(), nullable=True),
        sa.Column('portfolio_url', sa.String(length=500), nullable=True),
        sa.Column('linkedin_url', sa.String(length=500), nullable=True),
        sa.Column('github_url', sa.String(length=500), nullable=True),
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
    )
    op.create_index(op.f('ix_candidate_profiles_id'), 'candidate_profiles', ['id'], unique=False)

    # 3. employer_profiles
    op.create_table(
        'employer_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('company_name', sa.String(length=200), nullable=True),
        sa.Column('company_description', sa.Text(), nullable=True),
        sa.Column('company_website', sa.String(length=500), nullable=True),
        sa.Column('company_location', sa.String(length=150), nullable=True),
        sa.Column('industry', sa.String(length=120), nullable=True),
        sa.Column('company_logo', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
    )
    op.create_index(op.f('ix_employer_profiles_id'), 'employer_profiles', ['id'], unique=False)

    # 4. cvs
    op.create_table(
        'cvs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('candidate_id', sa.Integer(), nullable=False),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('file_type', sa.String(length=50), nullable=False, server_default='pdf'),
        sa.Column('extracted_text', sa.Text(), nullable=True),
        sa.Column('analysis_result', sa.JSON(), nullable=True),
        sa.Column('analysis_error', sa.Text(), nullable=True),
        sa.Column('analysis_status', sa.String(length=32), nullable=False, server_default='pending'),
        sa.Column('is_current', sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['candidate_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_cvs_id'), 'cvs', ['id'], unique=False)
    op.create_index(op.f('ix_cvs_candidate_id'), 'cvs', ['candidate_id'], unique=False)
    op.create_index(op.f('ix_cvs_is_current'), 'cvs', ['is_current'], unique=False)

    # 5. skills
    op.create_table(
        'skills',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=80), nullable=False),
        sa.Column('name_key', sa.String(length=80), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(length=80), nullable=False, server_default='General'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_skills_id'), 'skills', ['id'], unique=False)
    op.create_index(op.f('ix_skills_name_key'), 'skills', ['name_key'], unique=True)
    op.create_index(op.f('ix_skills_category'), 'skills', ['category'], unique=False)

    # 6. candidate_skills
    op.create_table(
        'candidate_skills',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('candidate_id', sa.Integer(), nullable=False),
        sa.Column('skill_id', sa.Integer(), nullable=False),
        sa.Column('source', sa.String(length=32), nullable=False),
        sa.Column('claimed_level', sa.String(length=32), nullable=True),
        sa.Column('verification_status', sa.String(length=32), nullable=False, server_default='unverified'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['candidate_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['skill_id'], ['skills.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('candidate_id', 'skill_id', name='uq_candidate_skill'),
    )
    op.create_index(op.f('ix_candidate_skills_id'), 'candidate_skills', ['id'], unique=False)
    op.create_index(op.f('ix_candidate_skills_candidate_id'), 'candidate_skills', ['candidate_id'], unique=False)
    op.create_index(op.f('ix_candidate_skills_skill_id'), 'candidate_skills', ['skill_id'], unique=False)

    # 7. assessments
    op.create_table(
        'assessments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('candidate_id', sa.Integer(), nullable=False),
        sa.Column('skill_id', sa.Integer(), nullable=False),
        sa.Column('total_questions', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('total_marks', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('score', sa.Integer(), nullable=True),
        sa.Column('percentage', sa.Float(), nullable=True),
        sa.Column('difficulty_level', sa.String(length=32), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='pending'),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['candidate_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['skill_id'], ['skills.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_assessments_id'), 'assessments', ['id'], unique=False)
    op.create_index(op.f('ix_assessments_candidate_id'), 'assessments', ['candidate_id'], unique=False)
    op.create_index(op.f('ix_assessments_skill_id'), 'assessments', ['skill_id'], unique=False)
    op.create_index(op.f('ix_assessments_status'), 'assessments', ['status'], unique=False)

    # 8. assessment_questions
    op.create_table(
        'assessment_questions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('assessment_id', sa.Integer(), nullable=False),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('question_type', sa.String(length=32), nullable=False),
        sa.Column('options', sa.JSON(), nullable=True),
        sa.Column('correct_answer', sa.Text(), nullable=False),
        sa.Column('marks', sa.Integer(), nullable=False),
        sa.Column('difficulty', sa.String(length=32), nullable=False),
        sa.Column('explanation', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['assessment_id'], ['assessments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_assessment_questions_id'), 'assessment_questions', ['id'], unique=False)
    op.create_index(op.f('ix_assessment_questions_assessment_id'), 'assessment_questions', ['assessment_id'], unique=False)

    # 9. assessment_answers
    op.create_table(
        'assessment_answers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('assessment_id', sa.Integer(), nullable=False),
        sa.Column('question_id', sa.Integer(), nullable=False),
        sa.Column('candidate_answer', sa.Text(), nullable=False),
        sa.Column('awarded_marks', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('is_correct', sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column('feedback', sa.Text(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['assessment_id'], ['assessments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['question_id'], ['assessment_questions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('assessment_id', 'question_id', name='uq_assessment_answer'),
    )
    op.create_index(op.f('ix_assessment_answers_id'), 'assessment_answers', ['id'], unique=False)
    op.create_index(op.f('ix_assessment_answers_assessment_id'), 'assessment_answers', ['assessment_id'], unique=False)
    op.create_index(op.f('ix_assessment_answers_question_id'), 'assessment_answers', ['question_id'], unique=False)

    # 10. skill_verifications
    op.create_table(
        'skill_verifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('candidate_id', sa.Integer(), nullable=False),
        sa.Column('skill_id', sa.Integer(), nullable=False),
        sa.Column('assessment_id', sa.Integer(), nullable=False),
        sa.Column('score', sa.Float(), nullable=False),
        sa.Column('verification_level', sa.String(length=32), nullable=True),
        sa.Column('verification_status', sa.String(length=32), nullable=False),
        sa.Column('is_current', sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column('verified_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['assessment_id'], ['assessments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['candidate_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['skill_id'], ['skills.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('assessment_id'),
    )
    op.create_index(op.f('ix_skill_verifications_id'), 'skill_verifications', ['id'], unique=False)
    op.create_index(op.f('ix_skill_verifications_candidate_id'), 'skill_verifications', ['candidate_id'], unique=False)
    op.create_index(op.f('ix_skill_verifications_skill_id'), 'skill_verifications', ['skill_id'], unique=False)
    op.create_index(op.f('ix_skill_verifications_is_current'), 'skill_verifications', ['is_current'], unique=False)

    # 11. jobs
    op.create_table(
        'jobs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('employer_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('responsibilities', sa.Text(), nullable=True),
        sa.Column('qualifications', sa.Text(), nullable=True),
        sa.Column('location', sa.String(length=150), nullable=True),
        sa.Column('employment_type', sa.String(length=32), nullable=True),
        sa.Column('experience_level', sa.String(length=32), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='draft'),
        sa.Column('application_deadline', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['employer_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_jobs_id'), 'jobs', ['id'], unique=False)
    op.create_index(op.f('ix_jobs_employer_id'), 'jobs', ['employer_id'], unique=False)
    op.create_index(op.f('ix_jobs_status'), 'jobs', ['status'], unique=False)

    # 12. job_skills
    op.create_table(
        'job_skills',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('job_id', sa.Integer(), nullable=False),
        sa.Column('skill_id', sa.Integer(), nullable=False),
        sa.Column('minimum_score', sa.Integer(), nullable=False, server_default=sa.text('50')),
        sa.Column('importance_weight', sa.Integer(), nullable=False, server_default=sa.text('1')),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['skill_id'], ['skills.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('job_id', 'skill_id', name='uq_job_skill'),
    )
    op.create_index(op.f('ix_job_skills_id'), 'job_skills', ['id'], unique=False)
    op.create_index(op.f('ix_job_skills_job_id'), 'job_skills', ['job_id'], unique=False)
    op.create_index(op.f('ix_job_skills_skill_id'), 'job_skills', ['skill_id'], unique=False)

    # 13. job_applications
    op.create_table(
        'job_applications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('job_id', sa.Integer(), nullable=False),
        sa.Column('candidate_id', sa.Integer(), nullable=False),
        sa.Column('application_status', sa.String(length=32), nullable=False, server_default='pending'),
        sa.Column('match_score', sa.Float(), nullable=True),
        sa.Column('cover_letter', sa.Text(), nullable=True),
        sa.Column('applied_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['candidate_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('job_id', 'candidate_id', name='uq_job_application'),
    )
    op.create_index(op.f('ix_job_applications_id'), 'job_applications', ['id'], unique=False)
    op.create_index(op.f('ix_job_applications_candidate_id'), 'job_applications', ['candidate_id'], unique=False)
    op.create_index(op.f('ix_job_applications_job_id'), 'job_applications', ['job_id'], unique=False)
    op.create_index(op.f('ix_job_applications_application_status'), 'job_applications', ['application_status'], unique=False)

    # 14. candidate_rankings
    op.create_table(
        'candidate_rankings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('candidate_id', sa.Integer(), nullable=False),
        sa.Column('skill_id', sa.Integer(), nullable=False),
        sa.Column('score', sa.Float(), nullable=False),
        sa.Column('rank', sa.Integer(), nullable=False),
        sa.Column('ranking_period', sa.String(length=32), nullable=False, server_default='all_time'),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['candidate_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['skill_id'], ['skills.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('candidate_id', 'skill_id', 'ranking_period', name='uq_candidate_ranking'),
    )
    op.create_index(op.f('ix_candidate_rankings_id'), 'candidate_rankings', ['id'], unique=False)
    op.create_index(op.f('ix_candidate_rankings_candidate_id'), 'candidate_rankings', ['candidate_id'], unique=False)
    op.create_index(op.f('ix_candidate_rankings_skill_id'), 'candidate_rankings', ['skill_id'], unique=False)
    op.create_index(op.f('ix_candidate_rankings_rank'), 'candidate_rankings', ['rank'], unique=False)
    op.create_index(op.f('ix_candidate_rankings_ranking_period'), 'candidate_rankings', ['ranking_period'], unique=False)

    # 15. revoked_tokens
    op.create_table(
        'revoked_tokens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('jti', sa.String(length=64), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_revoked_tokens_id'), 'revoked_tokens', ['id'], unique=False)
    op.create_index(op.f('ix_revoked_tokens_jti'), 'revoked_tokens', ['jti'], unique=True)
    op.create_index(op.f('ix_revoked_tokens_expires_at'), 'revoked_tokens', ['expires_at'], unique=False)


def downgrade() -> None:
    op.drop_table('revoked_tokens')
    op.drop_table('candidate_rankings')
    op.drop_table('job_applications')
    op.drop_table('job_skills')
    op.drop_table('jobs')
    op.drop_table('skill_verifications')
    op.drop_table('assessment_answers')
    op.drop_table('assessment_questions')
    op.drop_table('assessments')
    op.drop_table('candidate_skills')
    op.drop_table('skills')
    op.drop_table('cvs')
    op.drop_table('employer_profiles')
    op.drop_table('candidate_profiles')
    op.drop_table('users')

