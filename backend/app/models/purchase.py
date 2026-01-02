"""
Purchase Management Models
- PurchaseOrder: Main purchase order document
- POLineItem: Line items in purchase order
- GoodsReceipt: Received items from vendor
- PurchaseReturn: Return items to vendor
- VendorBill: Vendor invoice/bill tracking
"""

from beanie import Document, Indexed
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class POStatus(str, Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED"
    FULLY_RECEIVED = "FULLY_RECEIVED"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"


class GRStatus(str, Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    PARTIAL = "PARTIAL"


class ReturnStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    PROCESSED = "PROCESSED"
    CANCELLED = "CANCELLED"


class BillStatus(str, Enum):
    PENDING = "PENDING"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    PAID = "PAID"
    CANCELLED = "CANCELLED"


# ==================== PURCHASE ORDER ====================
class PurchaseOrder(Document):
    """Main Purchase Order document"""
    po_code: Indexed(str, unique=True)
    vendor_code: Indexed(str)
    vendor_name: str
    po_date: datetime = Field(default_factory=datetime.utcnow)
    delivery_date: Optional[datetime] = None
    status: POStatus = POStatus.DRAFT

    # Line items - list of dicts with item_code, item_name, quantity, uom, unit_price, total_amount
    line_items: List[dict] = []

    # Totals
    subtotal: float = 0
    tax_rate: float = 0
    tax_amount: float = 0
    discount_amount: float = 0
    total_amount: float = 0

    # Shipping
    shipping_address: Optional[str] = None
    shipping_method: Optional[str] = None

    # Additional
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None
    attachments: Optional[List[str]] = None

    # Tracking
    created_by: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Settings:
        name = "purchase_orders"
        indexes = [
            "po_code",
            "vendor_code",
            "status",
            "created_at",
        ]


# ==================== GOODS RECEIPT ====================
class GoodsReceipt(Document):
    """Goods Receipt - received from vendor"""
    gr_code: Indexed(str, unique=True)
    po_code: Indexed(str)
    vendor_code: str
    vendor_name: Optional[str] = None
    gr_date: datetime = Field(default_factory=datetime.utcnow)
    status: GRStatus = GRStatus.PENDING

    # Received items - list of dicts with item_code, item_name, ordered_qty, received_qty, damaged_qty, accepted_qty
    received_items: List[dict] = []

    # Quality check
    quality_check_done: bool = False
    quality_remarks: Optional[str] = None

    # Invoice reference
    invoice_number: Optional[str] = None
    invoice_date: Optional[datetime] = None

    # Warehouse
    warehouse_id: Optional[str] = None
    warehouse_name: Optional[str] = None

    # Tracking
    received_by: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

    class Settings:
        name = "goods_receipts"
        indexes = [
            "gr_code",
            "po_code",
            "vendor_code",
            "status",
        ]


# ==================== PURCHASE RETURN ====================
class PurchaseReturn(Document):
    """Purchase Return - return items to vendor"""
    pr_code: Indexed(str, unique=True)
    po_code: Optional[str] = None
    gr_code: Optional[str] = None
    vendor_code: Indexed(str)
    vendor_name: Optional[str] = None
    return_date: datetime = Field(default_factory=datetime.utcnow)

    # Returned items - list of dicts with item_code, item_name, return_qty, reason, unit_price
    returned_items: List[dict] = []

    # Amounts
    total_return_amount: float = 0

    # Debit note
    debit_note_number: Optional[str] = None
    debit_note_date: Optional[datetime] = None

    # Status
    status: ReturnStatus = ReturnStatus.PENDING

    # Remarks
    return_reason: Optional[str] = None
    remarks: Optional[str] = None

    # Tracking
    requested_by: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "purchase_returns"
        indexes = [
            "pr_code",
            "po_code",
            "vendor_code",
            "status",
        ]


# ==================== VENDOR BILL ====================
class VendorBill(Document):
    """Vendor Invoice/Bill"""
    bill_code: Indexed(str, unique=True)
    po_code: Optional[str] = None
    gr_code: Optional[str] = None
    vendor_code: Indexed(str)
    vendor_name: str

    # Invoice details
    invoice_number: str
    invoice_date: datetime
    due_date: datetime

    # Amounts
    subtotal: float = 0
    tax_rate: float = 0
    tax_amount: float = 0
    discount_amount: float = 0
    total_amount: float = 0
    paid_amount: float = 0
    pending_amount: float = 0

    # Status
    status: BillStatus = BillStatus.PENDING
    payment_terms: Optional[str] = None

    # Payment tracking
    payments: List[dict] = []  # list of {amount, date, reference, method}
    last_payment_date: Optional[datetime] = None
    last_payment_reference: Optional[str] = None

    # Tracking
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Settings:
        name = "vendor_bills"
        indexes = [
            "bill_code",
            "po_code",
            "vendor_code",
            "status",
            "due_date",
        ]


# ==================== REQUEST/RESPONSE SCHEMAS ====================

class POLineItemSchema(BaseModel):
    item_code: str
    item_name: str
    quantity: float
    uom: str = "PCS"
    unit_price: float = 0
    tax_rate: float = 0
    total_amount: float = 0


class PurchaseOrderCreate(BaseModel):
    vendor_code: str
    vendor_name: str
    delivery_date: Optional[str] = None
    line_items: List[dict] = []
    subtotal: float = 0
    tax_rate: float = 0
    tax_amount: float = 0
    discount_amount: float = 0
    total_amount: float = 0
    shipping_address: Optional[str] = None
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None


class GoodsReceiptCreate(BaseModel):
    po_code: str
    vendor_code: str
    vendor_name: Optional[str] = None
    received_items: List[dict] = []
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    warehouse_id: Optional[str] = None
    warehouse_name: Optional[str] = None
    quality_remarks: Optional[str] = None


class PurchaseReturnCreate(BaseModel):
    po_code: Optional[str] = None
    gr_code: Optional[str] = None
    vendor_code: str
    vendor_name: Optional[str] = None
    returned_items: List[dict] = []
    total_return_amount: float = 0
    return_reason: Optional[str] = None
    remarks: Optional[str] = None


class VendorBillCreate(BaseModel):
    po_code: Optional[str] = None
    gr_code: Optional[str] = None
    vendor_code: str
    vendor_name: str
    invoice_number: str
    invoice_date: str
    due_date: str
    subtotal: float = 0
    tax_rate: float = 0
    tax_amount: float = 0
    discount_amount: float = 0
    total_amount: float = 0
    payment_terms: Optional[str] = None


class PaymentCreate(BaseModel):
    amount: float
    reference: Optional[str] = None
    method: Optional[str] = None
