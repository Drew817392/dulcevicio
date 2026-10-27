from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # antes de usar una conexión, la prueba
    pool_recycle=300,    # y no reusa ninguna de más de 5 minutos
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,   # antes de usar una conexión, la prueba
    pool_recycle=300,     # y no reusa ninguna de más de 5 minutos
)
