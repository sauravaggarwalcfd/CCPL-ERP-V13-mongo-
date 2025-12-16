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
        ],
    )


async def close_mongo_connection():
    if db.client:
        db.client.close()
