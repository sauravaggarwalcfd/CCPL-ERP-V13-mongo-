"""
Inventory Management Models
- InventoryStock: Current inventory levels per item
- StockMovement: Track all stock movements
- StockAdjustment: Stock adjustments and corrections
- StockTransfer: Transfer stock between locations
- StockLevel: Define min/max stock levels
"""

from beanie import Document, Indexed
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class MovementType(str, Enum):
    IN = "IN"
    OUT = "OUT"
    ADJUSTMENT = "ADJUSTMENT"
    TRANSFER = "TRANSFER"
    ISSUE = "ISSUE"
    RETURN = "RETURN"
    OPENING = "OPENING"


class AdjustmentReason(str, Enum):
    DAMAGE = "DAMAGE"
    LOSS = "LOSS"
    CORRECTION = "CORRECTION"
    AUDIT = "AUDIT"
    EXPIRED = "EXPIRED"
    OTHER = "OTHER"


class TransferStatus(str, Enum):
    PENDING = "PENDING"
    IN_TRANSIT = "IN_TRANSIT"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


# ==================== INVENTORY STOCK ====================
class InventoryStock(Document):
    """Current inventory levels per item"""
    item_code: Indexed(str, unique=True)
    item_name: Optional[str] = None

    # UOM - Always storage UOM
    uom: str = "PCS"  # Storage UOM - all quantities are in this unit

    # Stock quantities
    opening_stock: float = 0
    current_stock: float = 0
    reserved_stock: float = 0
    available_stock: float = 0  # current_stock - reserved_stock

    # Location
    warehouse_id: Optional[str] = None
    warehouse_name: Optional[str] = None
    bin_location: Optional[str] = None

    # Stock value
    unit_cost: float = 0
    total_value: float = 0  # current_stock * unit_cost

    # Timestamps
    last_movement_date: Optional[datetime] = None
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "inventory_stock"
        indexes = [
            "item_code",
            "warehouse_id",
        ]


# ==================== STOCK MOVEMENT ====================
class StockMovement(Document):
    """Track all stock movements"""
    movement_id: Indexed(str, unique=True)
    item_code: Indexed(str)
    item_name: Optional[str] = None

    movement_type: MovementType
    quantity: float  # Quantity in target/storage UOM
    unit_cost: float = 0
    total_value: float = 0

    # UOM Conversion Tracking (for goods receipt from purchase)
    source_uom: Optional[str] = None  # UOM of source (e.g., purchase_uom)
    target_uom: Optional[str] = None  # UOM of target (storage_uom)
    conversion_factor: float = 1.0  # Applied conversion factor
    source_quantity: Optional[float] = None  # Quantity in source UOM (before conversion)

    # Before/After balances
    balance_before: float = 0
    balance_after: float = 0

    # Location info
    from_location: Optional[str] = None
    to_location: Optional[str] = None
    warehouse_id: Optional[str] = None

    # Reference
    reference_type: Optional[str] = None  # PO, SO, WO, TRANSFER, ADJUSTMENT
    reference_number: Optional[str] = None

    remarks: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "stock_movements"
        indexes = [
            "item_code",
            "movement_type",
            "reference_number",
            "created_at",
        ]


# ==================== STOCK ADJUSTMENT ====================
class StockAdjustment(Document):
    """Stock adjustments and corrections"""
    adjustment_id: Indexed(str, unique=True)
    item_code: Indexed(str)
    item_name: Optional[str] = None

    previous_stock: float
    adjusted_stock: float
    adjustment_quantity: float  # Can be positive or negative

    reason: AdjustmentReason
    remarks: Optional[str] = None

    warehouse_id: Optional[str] = None
    warehouse_name: Optional[str] = None

    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None

    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "stock_adjustments"
        indexes = [
            "item_code",
            "reason",
            "created_at",
        ]


# ==================== STOCK TRANSFER ====================
class StockTransfer(Document):
    """Transfer stock between locations/warehouses"""
    transfer_id: Indexed(str, unique=True)
    item_code: Indexed(str)
    item_name: Optional[str] = None

    quantity: float

    from_warehouse_id: Optional[str] = None
    from_warehouse_name: Optional[str] = None
    from_location: Optional[str] = None

    to_warehouse_id: Optional[str] = None
    to_warehouse_name: Optional[str] = None
    to_location: Optional[str] = None

    status: TransferStatus = TransferStatus.PENDING

    requested_by: Optional[str] = None
    requested_at: datetime = Field(default_factory=datetime.utcnow)

    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None

    completed_by: Optional[str] = None
    completed_at: Optional[datetime] = None

    remarks: Optional[str] = None

    class Settings:
        name = "stock_transfers"
        indexes = [
            "item_code",
            "status",
            "from_warehouse_id",
            "to_warehouse_id",
        ]


# ==================== STOCK LEVEL (Min/Max Settings) ====================
class StockLevel(Document):
    """Define min/max stock levels per item"""
    item_code: Indexed(str, unique=True)
    item_name: Optional[str] = None

    minimum_stock: float = 10
    maximum_stock: float = 1000
    reorder_point: float = 20
    reorder_quantity: float = 100

    warehouse_id: Optional[str] = None

    is_active: bool = True
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "stock_levels"
        indexes = [
            "item_code",
            "warehouse_id",
        ]


# ==================== STOCK ISSUE ====================
class StockIssue(Document):
    """Stock issue for production or internal use"""
    issue_id: Indexed(str, unique=True)
    item_code: Indexed(str)
    item_name: Optional[str] = None

    quantity: float

    issue_type: str  # PRODUCTION, INTERNAL, SAMPLE, OTHER
    department: Optional[str] = None
    purpose: Optional[str] = None

    reference_number: Optional[str] = None  # Work Order, etc.

    issued_by: Optional[str] = None
    issued_at: datetime = Field(default_factory=datetime.utcnow)

    received_by: Optional[str] = None
    remarks: Optional[str] = None

    class Settings:
        name = "stock_issues"
        indexes = [
            "item_code",
            "issue_type",
            "issued_at",
        ]


# ==================== REQUEST/RESPONSE SCHEMAS ====================

class StockMovementCreate(BaseModel):
    item_code: str
    movement_type: MovementType
    quantity: float
    unit_cost: Optional[float] = 0
    from_location: Optional[str] = None
    to_location: Optional[str] = None
    reference_type: Optional[str] = None
    reference_number: Optional[str] = None
    remarks: Optional[str] = None


class StockAdjustmentCreate(BaseModel):
    item_code: str
    adjusted_stock: float
    reason: AdjustmentReason
    remarks: Optional[str] = None
    warehouse_id: Optional[str] = None


class StockTransferCreate(BaseModel):
    item_code: str
    quantity: float
    from_warehouse_id: Optional[str] = None
    from_location: Optional[str] = None
    to_warehouse_id: Optional[str] = None
    to_location: Optional[str] = None
    remarks: Optional[str] = None


class StockIssueCreate(BaseModel):
    item_code: str
    quantity: float
    issue_type: str
    department: Optional[str] = None
    purpose: Optional[str] = None
    reference_number: Optional[str] = None
    remarks: Optional[str] = None


class AddStockRequest(BaseModel):
    item_code: str
    quantity: float
    unit_cost: Optional[float] = 0
    remarks: Optional[str] = None
    reference_type: Optional[str] = None
    reference_number: Optional[str] = None


class RemoveStockRequest(BaseModel):
    item_code: str
    quantity: float
    remarks: Optional[str] = None
    reference_type: Optional[str] = None
    reference_number: Optional[str] = None
