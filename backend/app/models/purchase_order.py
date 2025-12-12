from beanie import Document, Indexed
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from enum import Enum
from bson import ObjectId


class POStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    CONFIRMED = "confirmed"
    PARTIAL = "partial"
    RECEIVED = "received"
    CANCELLED = "cancelled"


class POItem(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    product: dict  # {id, style_number, name}
    variant: dict  # {id, sku, color, size, barcode}
    ordered_quantity: int
    received_quantity: int = 0
    unit_cost: float
    tax_rate: float = 0
    tax_amount: float = 0
    discount_percent: float = 0
    total_amount: float
    notes: Optional[str] = None


class EmbeddedSupplier(BaseModel):
    id: str
    code: str
    company_name: str
    gst_number: Optional[str] = None


class PurchaseOrder(Document):
    po_number: Indexed(str, unique=True)  # PO-2024-0001

    supplier: EmbeddedSupplier
    warehouse: dict  # {id, code, name}

    status: POStatus = POStatus.DRAFT

    order_date: date = Field(default_factory=date.today)
    expected_date: Optional[date] = None
    received_date: Optional[date] = None

    items: List[POItem] = []

    subtotal: float = 0
    tax_amount: float = 0
    discount_amount: float = 0
    shipping_cost: float = 0
    total_amount: float = 0

    notes: Optional[str] = None
    terms_conditions: Optional[str] = None

    created_by: Optional[dict] = None
    approved_by: Optional[dict] = None
    approved_at: Optional[datetime] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "purchase_orders"
        indexes = ["po_number", "supplier.id", "status", [("order_date", -1)]]
