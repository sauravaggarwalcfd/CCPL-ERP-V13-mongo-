from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from .database import connect_to_mongo, close_mongo_connection
from .routes import (
    auth,
    users,
    roles,
    products,
    inventory,
    suppliers,
    purchases,
    purchase_orders,
    customers,
    sales,
    warehouses,
    transfers,
    adjustments,
    master_data,
    reports,
    items,
    item_types,
    category_hierarchy,
)
from .models.item_type import ItemType

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        await connect_to_mongo()
        logger.info("MongoDB connection successful")
    except Exception as e:
        logger.warning(f"MongoDB connection failed: {str(e)}")
        logger.warning("App starting with database unavailable - use for testing only")
    yield
    # Shutdown
    try:
        await close_mongo_connection()
    except Exception as e:
        logger.warning(f"Error closing MongoDB connection: {str(e)}")


app = FastAPI(
    title="Inventory Management ERP",
    description="API for Confidence Clothing Inventory System",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(roles.router, prefix="/api/roles", tags=["Roles"])
app.include_router(items.router, prefix="/api/items", tags=["Items"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["Inventory"])
app.include_router(suppliers.router, prefix="/api/suppliers", tags=["Suppliers"])
app.include_router(purchases.router, prefix="/api/purchase-orders-old", tags=["Purchases-Old"])
app.include_router(purchase_orders.router, prefix="/api/po", tags=["Purchase Orders"])
app.include_router(customers.router, prefix="/api/customers", tags=["Customers"])
app.include_router(sales.router, prefix="/api/sale-orders", tags=["Sales"])
app.include_router(warehouses.router, prefix="/api/warehouses", tags=["Warehouses"])
app.include_router(transfers.router, prefix="/api/transfers", tags=["Transfers"])
app.include_router(
    adjustments.router, prefix="/api/adjustments", tags=["Adjustments"]
)
app.include_router(
    master_data.router, prefix="/api/master-data", tags=["Master Data"]
)
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(item_types.router, prefix="/api/item-types", tags=["Item Types"])
app.include_router(category_hierarchy.router, prefix="/api/hierarchy", tags=["Category Hierarchy"])


@app.get("/")
async def root():
    return {"message": "Inventory ERP API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
