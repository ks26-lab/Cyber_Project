"""
Base declarative class and common audit mixins for GRIDSEC models.
"""

from datetime import datetime
from sqlalchemy import Column, DateTime, String
from app.database.connection import Base

class AuditMixin:
    """Provides common provenance and audit timestamps across all models."""
    data_source = Column(String(50), default="PROJECT_DATASET", nullable=False)
    source_url = Column(String(255), nullable=True)
    source_date = Column(String(50), nullable=True)
    last_verified = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
