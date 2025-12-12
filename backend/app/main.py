from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .database import connect_to_mongo, close_mongo_connection
from .routes import (
    auth,
    users,
    roles,
    products,
    inventory,
    suppliers,
    purchases,
    customers,
    sales,
    warehouses,
    transfers,
    adjustments,
    master_data,
    reports,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()


app = FastAPI(
    title="Inventory Management ERP",
    description="API for Confidence Clothing Inventory System",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(roles.router, prefix="/api/roles", tags=["Roles"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["Inventory"])
app.include_router(suppliers.router, prefix="/api/suppliers", tags=["Suppliers"])
app.include_router(purchases.router, prefix="/api/purchase-orders", tags=["Purchases"])
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


@app.get("/")
async def root():
    return {"message": "Inventory ERP API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
