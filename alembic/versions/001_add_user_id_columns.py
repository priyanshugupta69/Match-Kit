"""Add user_id FK to resumes, job_descriptions, and match_results.

Revision ID: 001
Revises:
Create Date: 2026-03-14
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add user_id column (nullable first so existing rows don't break)
    op.add_column("resumes", sa.Column("user_id", UUID(as_uuid=True), nullable=True))
    op.add_column("job_descriptions", sa.Column("user_id", UUID(as_uuid=True), nullable=True))
    op.add_column("match_results", sa.Column("user_id", UUID(as_uuid=True), nullable=True))

    # If there's existing data with no user, you can assign a default user here:
    # op.execute("UPDATE resumes SET user_id = '<some-user-uuid>' WHERE user_id IS NULL")

    # Add foreign key constraints
    op.create_foreign_key("fk_resumes_user_id", "resumes", "users", ["user_id"], ["id"], ondelete="CASCADE")
    op.create_foreign_key("fk_job_descriptions_user_id", "job_descriptions", "users", ["user_id"], ["id"], ondelete="CASCADE")
    op.create_foreign_key("fk_match_results_user_id", "match_results", "users", ["user_id"], ["id"], ondelete="CASCADE")

    # Once existing rows are backfilled, make columns NOT NULL:
    # op.alter_column("resumes", "user_id", nullable=False)
    # op.alter_column("job_descriptions", "user_id", nullable=False)
    # op.alter_column("match_results", "user_id", nullable=False)


def downgrade():
    op.drop_constraint("fk_match_results_user_id", "match_results", type_="foreignkey")
    op.drop_constraint("fk_job_descriptions_user_id", "job_descriptions", type_="foreignkey")
    op.drop_constraint("fk_resumes_user_id", "resumes", type_="foreignkey")
    op.drop_column("match_results", "user_id")
    op.drop_column("job_descriptions", "user_id")
    op.drop_column("resumes", "user_id")
