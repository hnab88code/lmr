from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
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


class OrderStatus(str, enum.Enum):
    received = "received"
    electric_company = "electric_company"
    delivery = "delivery"
    installing = "installing"
    activating = "activating"
    completed = "completed"


class ArrivalStatus(str, enum.Enum):
    pending = "pending"
    arrived = "arrived"


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


class SiteSetting(Base):
    __tablename__ = "site_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(50), unique=True, nullable=False)
    value = Column(String(500), default="")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    access_code = Column(String(20), nullable=False)
    customer_name = Column(String(100), nullable=False)
    customer_phone = Column(String(20), nullable=False)
    customer_email = Column(String(200), default="")
    status = Column(SAEnum(OrderStatus), default=OrderStatus.received)
    notes = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_name = Column(String(200), nullable=False)
    product_category = Column(String(20), default="")
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, nullable=True)
    arrival_status = Column(SAEnum(ArrivalStatus), default=ArrivalStatus.pending)
    order = relationship("Order", back_populates="items")
