from beanie import Document, Indexed
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class InventoryType(str, Enum):
    STOCKED = "stocked"
    NON_STOCKED = "non_stocked"
    CONSUMABLE = "consumable"


# ==================== ITEM CATEGORY ====================
class ItemCategory(Document):
    """
    Level 1: Item Category
    Example: CLOTH (Clothing), FOOT (Footwear), ACCS (Accessories)
    """
    category_id: Indexed(str, unique=True)  # CLOTH, FOOT, ACCS
    category_name: str  # Clothing, Footwear, Accessories
    category_code: str  # Short code for reference
    description: Optional[str] = None
    parent_category_id: Optional[str] = None  # For hierarchical structure
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "item_categories"
        indexes = ["category_id", "category_code"]


# ==================== ITEM SUB-CATEGORY ====================
class ItemSubCategory(Document):
    """
    Level 2: Item Sub-Category
    Example: TSHRT (T-Shirt), SHIRT (Shirt), PANTS (Pants)
    Parent: Item Category (e.g., CLOTH)
    """
    sub_category_id: Indexed(str, unique=True)  # TSHRT, SHIRT, PANTS
    sub_category_name: str  # T-Shirt, Shirt, Pants
    sub_category_code: str  # Short code
    category_id: Indexed(str)  # Reference to parent Item Category (CLOTH)
    category_name: str  # Denormalized: Clothing
    description: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "item_sub_categories"
        indexes = ["sub_category_id", "sub_category_code", "category_id"]


# ==================== ITEM MASTER ====================
class ItemMaster(Document):
    """
    Level 3: Item Master
    Example: TSHRT-M-BLUE-001 (Men's T-Shirt, Medium, Blue)
    References: Item Category + Item Sub-Category
    """
    item_code: Indexed(str, unique=True)  # TSHRT-M-BLUE-001
    item_name: str  # Men's Basic Crew Neck T-Shirt - Blue (Medium)
    item_description: Optional[str] = None
    
    # 3-Tier Hierarchy Links (MANDATORY)
    category_id: Indexed(str)  # CLOTH - Level 1
    category_name: str  # Clothing - Denormalized
    
    sub_category_id: Indexed(str)  # TSHRT - Level 2
    sub_category_name: str  # T-Shirt - Denormalized
    
    # Item Attributes (Optional based on sub-category)
    color_id: Optional[str] = None  # Reference to Color Master
    color_name: Optional[str] = None  # BLUE
    
    size_id: Optional[str] = None  # Reference to Size Master
    size_name: Optional[str] = None  # MEDIUM, M
    
    brand_id: Optional[str] = None  # Reference to Brand Master
    brand_name: Optional[str] = None
    
    # UOM and Inventory
    uom: str = "PCS"  # Unit of Measure (PCS, KG, LTR, MTR, etc.)
    inventory_type: InventoryType = InventoryType.STOCKED
    
    # Pricing
    cost_price: float = 0.0
    selling_price: float = 0.0
    mrp: float = 0.0  # Maximum Retail Price
    
    # Tax Information
    hsn_code: Optional[str] = None  # HSN Code for tax
    gst_rate: float = 5.0  # GST Rate (5, 12, 18, 28)
    
    # Warehouse & Stock Management
    warehouse_id: Optional[str] = None
    warehouse_name: Optional[str] = None
    bin_location: Optional[str] = None  # BIN / Location reference
    
    # Stock Levels
    min_stock_level: int = 5
    max_stock_level: int = 100
    reorder_point: int = 10
    reorder_quantity: int = 20
    current_stock: int = 0
    
    # Additional Master Details
    material: Optional[str] = None  # 100% Cotton, Polyester blend, etc.
    weight: Optional[float] = None  # in grams or kg
    dimensions: Optional[dict] = None  # {"length": 10, "width": 10, "height": 5}
    care_instructions: Optional[str] = None
    barcode: Optional[str] = None
    serial_tracked: bool = False  # Whether item requires serial number tracking
    batch_tracked: bool = True  # Whether item requires batch tracking
    
    # Status
    is_active: bool = True
    discontinued: bool = False
    discontinued_date: Optional[datetime] = None
    
    # Metadata
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_by: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "item_master"
        indexes = [
            "item_code",
            "category_id",
            "sub_category_id",
            "barcode",
            ("category_id", "sub_category_id"),
        ]


# ==================== REQUEST/RESPONSE SCHEMAS ====================
class ItemCategoryCreate(BaseModel):
    category_id: str
    category_name: str
    category_code: str
    description: Optional[str] = None
    parent_category_id: Optional[str] = None


class ItemCategoryResponse(ItemCategoryCreate):
    id: str
    is_active: bool
    created_at: datetime


class ItemSubCategoryCreate(BaseModel):
    sub_category_id: str
    sub_category_name: str
    sub_category_code: str
    category_id: str
    description: Optional[str] = None


class ItemSubCategoryResponse(ItemSubCategoryCreate):
    id: str
    category_name: str
    is_active: bool
    created_at: datetime


class ItemMasterCreate(BaseModel):
    item_code: str
    item_name: str
    item_description: Optional[str] = None
    category_id: str
    sub_category_id: str
    color_id: Optional[str] = None
    size_id: Optional[str] = None
    brand_id: Optional[str] = None
    uom: str = "PCS"
    inventory_type: InventoryType = InventoryType.STOCKED
    cost_price: float = 0.0
    selling_price: float = 0.0
    mrp: float = 0.0
    hsn_code: Optional[str] = None
    gst_rate: float = 5.0
    warehouse_id: Optional[str] = None
    bin_location: Optional[str] = None
    min_stock_level: int = 5
    max_stock_level: int = 100
    reorder_point: int = 10
    reorder_quantity: int = 20
    material: Optional[str] = None
    weight: Optional[float] = None
    care_instructions: Optional[str] = None
    barcode: Optional[str] = None


class ItemMasterResponse(ItemMasterCreate):
    id: str
    category_name: str
    sub_category_name: str
    color_name: Optional[str] = None
    size_name: Optional[str] = None
    brand_name: Optional[str] = None
    warehouse_name: Optional[str] = None
    current_stock: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
