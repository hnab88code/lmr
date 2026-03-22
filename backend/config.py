import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./lmr.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

SECRET_KEY = os.getenv("SECRET_KEY", "lmr-solar-dev-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 8

WHATSAPP_NUMBER = os.getenv("WHATSAPP_NUMBER", "972501234567")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@lmr-solar.co.il")
