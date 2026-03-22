from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime, Enum as SAEnum
from sqlalchemy.sql import func
from backend.database import Base
import enum


class ProductCategory(str, enum.Enum):
    panel = "panel"
    inverter = "inverter"
    battery = "battery"


class ContactStatus(str, enum.Enum):
    new = "new"
    contacted = "contacted"
    closed = "closed"


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(SAEnum(ProductCategory), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    brand = Column(String(100), nullable=False)
    description = Column(Text, default="")
    price = Column(Float, nullable=True)
    specs = Column(Text, default="{}")  # JSON string
    image_url = Column(String(500), default="")
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ContactRequest(Base):
    __tablename__ = "contact_requests"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(200), default="")
    message = Column(Text, default="")
    selected_products = Column(Text, default="[]")  # JSON string
    total_price = Column(Float, nullable=True)
    status = Column(SAEnum(ContactStatus), default=ContactStatus.new)
    created_at = Column(DateTime, server_default=func.now())
