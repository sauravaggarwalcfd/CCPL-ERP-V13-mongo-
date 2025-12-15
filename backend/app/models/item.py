from beanie import Document, Indexed
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class InventoryType(str, Enum):
    STOCKED = "stocked"
    NON_STOCKED = "non_stocked"
    CONSUMABLE = "consumable"


class InventoryClassType(str, Enum):
    RAW_MATERIALS = "raw_materials"
    SEMI_FINISHED = "semi_finished"
    FINISHED_GOODS = "finished_goods"
    ACCESSORIES = "accessories"
    PACKAGING = "packaging"


class UnitOfMeasure(str, Enum):
    METER = "meter"
    KG = "kg"
    PIECE = "piece"
    YARD = "yard"
    LITER = "liter"
    GRAM = "gram"
    DOZEN = "dozen"
    SET = "set"


# ==================== ITEM CATEGORY (ENHANCED) ====================
class ItemCategory(Document):
    """
    Item Category with UNLIMITED HIERARCHICAL DEPTH
    
    Supports infinite nesting through parent_category_id relationship.
    No restrictions on tree depth - can have as many levels as needed.
    
    Example Structure:
    Level 1: RAW MATERIALS (root)
      Level 2: FABRICS (child)
        Level 3: COTTON FABRICS (grandchild)
          Level 4: ORGANIC COTTON (great-grandchild)
            Level 5: CERTIFIED ORGANIC COTTON (great-great-grandchild)
              ... unlimited depth
    
    Features:
    - Parent-child relationships via parent_category_id
    - Level field tracks depth (auto-calculated)
    - Inherits inventory_class from ancestors
    - Supports full tree operations (CRUD, move, reorder)
    """
    category_id: Indexed(str, unique=True)  # Unique identifier
    category_name: str  # Display name (uppercase enforced)
    category_code: str  # Short code (max 4 letters, uppercase)
    description: Optional[str] = None
    
    # Hierarchy fields - enables infinite nesting
    parent_category_id: Optional[str] = None  # Parent reference (null = root level)
    parent_category_name: Optional[str] = None  # Denormalized for display
    level: int = 1  # Depth in tree (1=root, 2=child, 3=grandchild, ... no limit)
    
    # Inventory classification
    inventory_class: Optional[InventoryClassType] = None  # For level 1
    
    # Material attributes
    selected_uoms: Optional[List[str]] = []  # Multiple units of measure allowed
    waste_percentage: Optional[float] = 0.0  # Expected wastage (%)
    reorder_point: Optional[int] = None  # Min stock level
    lead_time_days: Optional[int] = None  # Procurement lead time
    
    # Supplier & Cost (can link to supplier master later)
    preferred_supplier_id: Optional[str] = None
    preferred_supplier_name: Optional[str] = None
    standard_cost: Optional[float] = None  # Standard cost per UOM
    
    # Quality & Tracking
    requires_batch_tracking: bool = False
    requires_expiry_tracking: bool = False
    quality_check_required: bool = False
    
    # Storage requirements
    storage_requirements: Optional[str] = None  # Temperature, humidity, etc.
    handling_instructions: Optional[str] = None
    
    # System fields
    is_active: bool = True
    sort_order: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "item_categories"
        indexes = ["category_id", "category_code", "parent_category_id", "level", "inventory_class"]


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
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    category_code: Optional[str] = None
    description: Optional[str] = None
    
    # Hierarchy
    parent_category_id: Optional[str] = None
    parent_category_name: Optional[str] = None
    level: int = 1
    
    # Inventory classification (REQUIRED)
    inventory_class: InventoryClassType
    
    # Material attributes (REQUIRED)
    selected_uoms: List[str]
    waste_percentage: Optional[float] = 0.0
    reorder_point: Optional[int] = None
    lead_time_days: Optional[int] = None
    
    # Supplier & Cost
    preferred_supplier_id: Optional[str] = None
    preferred_supplier_name: Optional[str] = None
    standard_cost: Optional[float] = None
    
    # Quality & Tracking
    requires_batch_tracking: bool = False
    requires_expiry_tracking: bool = False
    quality_check_required: bool = False
    
    # Storage
    storage_requirements: Optional[str] = None
    handling_instructions: Optional[str] = None
    
    # System
    sort_order: int = 0


class ItemCategoryResponse(BaseModel):
    id: str
    category_id: str
    category_name: Optional[str] = None
    category_code: Optional[str] = None
    description: Optional[str] = None
    parent_category_id: Optional[str] = None
    parent_category_name: Optional[str] = None
    level: int
    inventory_class: InventoryClassType
    selected_uoms: List[str]
    waste_percentage: Optional[float] = 0.0
    reorder_point: Optional[int] = None
    lead_time_days: Optional[int] = None
    preferred_supplier_id: Optional[str] = None
    preferred_supplier_name: Optional[str] = None
    standard_cost: Optional[float] = None
    requires_batch_tracking: bool = False
    requires_expiry_tracking: bool = False
    quality_check_required: bool = False
    storage_requirements: Optional[str] = None
    handling_instructions: Optional[str] = None
    sort_order: int = 0
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None


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
