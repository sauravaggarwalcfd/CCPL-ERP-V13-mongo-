"""
Purchase Request Models
PR system for requesting items before creating Purchase Orders
"""

from beanie import Document, Indexed
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, date
from enum import Enum


class PRStatus(str, Enum):
    """Purchase Request Status Enum"""
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CONVERTED = "CONVERTED"  # Converted to PO
    CANCELLED = "CANCELLED"


class PRPriority(str, Enum):
    """Priority Enum"""
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"


class PRLineItem(BaseModel):
    """Line item in Purchase Request"""
    line_number: int
    item_code: Optional[str] = None
    item_name: str
    item_description: Optional[str] = None
    item_category: Optional[str] = None
    category_path: Optional[str] = None
    category_code: Optional[str] = None
    sub_category_code: Optional[str] = None
    division_code: Optional[str] = None
    class_code: Optional[str] = None
    sub_class_code: Optional[str] = None
    quantity: float
    unit: str = "PCS"
    estimated_unit_rate: Optional[float] = None
    estimated_amount: Optional[float] = None
    required_date: Optional[date] = None
    # Specifications
    colour_code: Optional[str] = None
    size_code: Optional[str] = None
    uom_code: Optional[str] = None
    specifications: Optional[dict] = None
    # Recommended Supplier
    suggested_supplier_code: Optional[str] = None
    suggested_supplier_name: Optional[str] = None
    # Recommended Brand
    suggested_brand_code: Optional[str] = None
    suggested_brand_name: Optional[str] = None
    notes: Optional[str] = None
    is_new_item: Optional[bool] = False
    is_approved: bool = False
    approved_quantity: Optional[float] = None
    rejection_reason: Optional[str] = None


class PurchaseRequest(Document):
    """Purchase Request Document"""
    
    # PR Identification
    pr_code: Indexed(str, unique=True)
    pr_date: date = Field(default_factory=date.today)
    
    # Requester Info
    requested_by: str  # User who created the request
    requested_by_name: Optional[str] = None
    department: Optional[str] = None
    
    # Request Details
    priority: PRPriority = PRPriority.NORMAL
    required_by_date: Optional[date] = None
    purpose: Optional[str] = None
    justification: Optional[str] = None
    
    # Line Items
    items: List[PRLineItem] = []
    
    # Totals
    total_items: int = 0
    total_quantity: float = 0
    estimated_total: float = 0
    
    # Status & Workflow
    status: PRStatus = PRStatus.DRAFT
    
    # Approval Info
    approved_by: Optional[str] = None
    approved_by_name: Optional[str] = None
    approved_date: Optional[datetime] = None
    approval_notes: Optional[str] = None
    
    # Rejection Info
    rejected_by: Optional[str] = None
    rejected_by_name: Optional[str] = None
    rejected_date: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    
    # Conversion Info (when converted to PO)
    converted_to_po: Optional[str] = None  # PO Code
    converted_date: Optional[datetime] = None
    converted_by: Optional[str] = None
    
    # Notes & Attachments
    notes: Optional[str] = None
    attachments: List[str] = []
    
    # Audit
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    class Settings:
        name = "purchase_requests"
        indexes = [
            "pr_code",
            "status",
            "requested_by",
            "pr_date",
            "priority",
        ]

    def calculate_totals(self):
        """Calculate PR totals from line items"""
        self.total_items = len(self.items)
        self.total_quantity = sum(item.quantity for item in self.items)
        self.estimated_total = sum(
            (item.estimated_amount or 0) for item in self.items
        )


# ==================== PYDANTIC SCHEMAS ====================

class PRLineItemCreate(BaseModel):
    """Schema for creating PR line item"""
    item_code: Optional[str] = None
    item_name: str
    item_description: Optional[str] = None
    item_category: Optional[str] = None
    category_path: Optional[str] = None
    category_code: Optional[str] = None
    sub_category_code: Optional[str] = None
    division_code: Optional[str] = None
    class_code: Optional[str] = None
    sub_class_code: Optional[str] = None
    quantity: float
    unit: str = "PCS"
    estimated_unit_rate: Optional[float] = None
    required_date: Optional[date] = None
    # Specifications
    colour_code: Optional[str] = None
    size_code: Optional[str] = None
    uom_code: Optional[str] = None
    specifications: Optional[dict] = None
    # Recommended Supplier
    suggested_supplier_code: Optional[str] = None
    suggested_supplier_name: Optional[str] = None
    # Recommended Brand
    suggested_brand_code: Optional[str] = None
    suggested_brand_name: Optional[str] = None
    notes: Optional[str] = None
    is_new_item: Optional[bool] = False


class PurchaseRequestCreate(BaseModel):
    """Schema for creating Purchase Request"""
    model_config = ConfigDict(populate_by_name=True)

    pr_date: Optional[date] = None
    department: Optional[str] = None
    priority: PRPriority = PRPriority.NORMAL
    required_by_date: Optional[date] = None
    purpose: Optional[str] = None
    justification: Optional[str] = None
    line_items: List[PRLineItemCreate] = Field(default=[], alias='items')
    notes: Optional[str] = None


class PurchaseRequestUpdate(BaseModel):
    """Schema for updating Purchase Request"""
    model_config = ConfigDict(populate_by_name=True)

    department: Optional[str] = None
    priority: Optional[PRPriority] = None
    required_by_date: Optional[date] = None
    purpose: Optional[str] = None
    justification: Optional[str] = None
    line_items: Optional[List[PRLineItemCreate]] = Field(default=None, alias='items')
    notes: Optional[str] = None


class PRApproval(BaseModel):
    """Schema for PR approval"""
    approval_notes: Optional[str] = None
    approved_items: Optional[List[dict]] = None  # List of {line_number, approved_quantity}


class PRRejection(BaseModel):
    """Schema for PR rejection"""
    rejection_reason: str
