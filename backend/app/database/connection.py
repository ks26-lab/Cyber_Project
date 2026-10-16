"""
Database Connection & Engine Manager for GRIDSEC Platform
Supports PostgreSQL as primary database with auto-fallback to SQLite for zero-config local development.
"""

import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

logger = logging.getLogger("gridsec.database")
logging.basicConfig(level=logging.INFO)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/gridsec")

# Configure database engine with PostgreSQL / SQLite fallback
try:
    if DATABASE_URL.startswith("postgresql"):
        # Test connection to PostgreSQL
        test_engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args={"connect_timeout": 2})
        with test_engine.connect() as conn:
            pass
        engine = test_engine
        logger.info(f"Connected to PostgreSQL database: {DATABASE_URL.split('@')[-1]}")
    else:
        if DATABASE_URL.startswith("sqlite:///") and not os.path.isabs(DATABASE_URL[10:]):
            rel_path = DATABASE_URL[10:]
            abs_db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", rel_path))
            DATABASE_URL = f"sqlite:///{abs_db_path}"
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False, "timeout": 60.0})
        logger.info(f"Connected to database: {DATABASE_URL}")
except Exception as e:
    logger.warning(f"PostgreSQL connection to {DATABASE_URL} failed ({e}). Falling back to local SQLite database.")
    sqlite_path = os.path.join(os.path.dirname(__file__), "..", "..", "gridsec.db")
    DATABASE_URL = f"sqlite:///{os.path.abspath(sqlite_path)}"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False, "timeout": 60.0})
    logger.info(f"Active database: SQLite ({sqlite_path})")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
db_mode = "postgresql" if "postgresql" in DATABASE_URL else "sqlite"

def get_db():
    """FastAPI Dependency for database session management."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
