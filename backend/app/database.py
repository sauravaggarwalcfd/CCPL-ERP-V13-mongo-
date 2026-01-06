from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from .config import settings
from .models import (
    User, Role, Permission, Product, Warehouse, Inventory,
    StockMovement, Supplier, PurchaseOrder, Customer, SaleOrder,
    StockTransfer, StockAdjustment, Category, Brand, Season,
    Color, Size, AuditLog
)
from .models.item import ItemMaster
from .models.item_type import ItemType
from .models.category_hierarchy import (
    ItemCategory,
    ItemSubCategory,
    ItemDivision,
    ItemClass,
    ItemSubClass
)
from .models.colour_master import ColourMaster
from .models.size_master import SizeMaster
from .models.uom_master import UOMMaster
from .models.variant_groups import VariantGroup
from .models.specifications import CategorySpecifications, ItemSpecifications
from .models.brand_master import BrandMaster, BrandGroup
from .models.supplier_master import SupplierMaster, SupplierGroup
from .models.file_master import FileMaster
from .models.inventory_management import (
    InventoryStock,
    StockMovement as InventoryStockMovement,
    StockAdjustment as InventoryStockAdjustment,
    StockTransfer as InventoryStockTransfer,
    StockLevel,
    StockIssue
)
from .models.purchase import (
    PurchaseOrder as PurchaseOrderNew,
    GoodsReceipt,
    PurchaseReturn,
    VendorBill
)
from .models.purchase_request import PurchaseRequest


class Database:
    client: AsyncIOMotorClient = None


db = Database()


async def connect_to_mongo():
    db.client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=db.client[settings.DATABASE_NAME],
        document_models=[
            User,
            Role,
            Permission,
            Product,
            Warehouse,
            Inventory,
            StockMovement,
            Supplier,
            PurchaseOrder,
            Customer,
            SaleOrder,
            StockTransfer,
            StockAdjustment,
            Category,
            Brand,
            Season,
            Color,
            Size,
            AuditLog,
            ItemMaster,
            ItemType,
            ItemCategory,           # 5-level hierarchy
            ItemSubCategory,
            ItemDivision,
            ItemClass,
            ItemSubClass,
            ColourMaster,           # Variant Masters
            SizeMaster,
            UOMMaster,
            VariantGroup,
            CategorySpecifications,  # Specifications
            ItemSpecifications,
            BrandMaster,            # Masters
            BrandGroup,
            SupplierMaster,
            SupplierGroup,
            FileMaster,             # File Management
            InventoryStock,         # Inventory Management
            InventoryStockMovement,
            InventoryStockAdjustment,
            InventoryStockTransfer,
            StockLevel,
            StockIssue,
            PurchaseOrderNew,       # Purchase Management
            GoodsReceipt,
            PurchaseReturn,
            VendorBill,
            PurchaseRequest,        # Purchase Requests
        ],
    )


async def close_mongo_connection():
    if db.client:
        db.client.close()
