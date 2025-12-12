from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from .config import settings
from .models import (
    User, Role, Permission, Product, Warehouse, Inventory,
    StockMovement, Supplier, PurchaseOrder, Customer, SaleOrder,
    StockTransfer, StockAdjustment, Category, Brand, Season,
    Color, Size, AuditLog
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
        ],
    )


async def close_mongo_connection():
    if db.client:
        db.client.close()
