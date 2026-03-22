from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


model_config = ConfigDict(protected_namespaces=())


class LoginRequest(BaseModel):
    model_config = model_config
    username: str
    password: str


class TokenResponse(BaseModel):
    model_config = model_config
    access_token: str
    token_type: str = "bearer"


class ProductCreate(BaseModel):
    model_config = model_config
    category: str
    name: str
    brand: str
    description: str = ""
    price: Optional[float] = None
    specs: str = "{}"
    image_url: str = ""
    is_active: bool = True
    sort_order: int = 0


class ProductUpdate(BaseModel):
    model_config = model_config
    name: Optional[str] = None
    brand: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    specs: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class ProductResponse(BaseModel):
    model_config = model_config
    id: int
    category: str
    name: str
    brand: str
    description: str
    price: Optional[float]
    specs: str
    image_url: str
    is_active: bool
    sort_order: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]


class ContactCreate(BaseModel):
    model_config = model_config
    name: str
    phone: str
    email: str = ""
    message: str = ""
    selected_products: str = "[]"
    total_price: Optional[float] = None


class ContactResponse(BaseModel):
    model_config = model_config
    id: int
    name: str
    phone: str
    email: str
    message: str
    selected_products: str
    total_price: Optional[float]
    status: str
    created_at: Optional[datetime]
