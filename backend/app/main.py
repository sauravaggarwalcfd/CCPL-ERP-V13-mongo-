from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from contextlib import asynccontextmanager
from pathlib import Path
import logging
import json
import traceback
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
    purchase_requests,
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
    colours,
    sizes,
    uoms,
    variant_groups,
    specifications,
    brands,
    files,
    purchase,
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

# CORS - Allow specific origins including forwarded port and local network
# This enables access from forwarded public IP and local network
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://192.168.1.25:5173",
    "http://103.223.12.235:5173",  # Forwarded public IP
    # Add any other IPs that need access
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,  # Enable credentials for authentication
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# Add validation error handler for better error messages
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    error_details = []
    for error in errors:
        error_details.append({
            "field": " -> ".join(str(loc) for loc in error.get("loc", [])),
            "message": error.get("msg", ""),
            "type": error.get("type", ""),
            "input": str(error.get("input", ""))[:100]  # Truncate long inputs
        })

    logger.error(f"Validation error on {request.url.path}: {json.dumps(error_details, indent=2)}")

    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation error",
            "errors": error_details
        }
    )


# Add handler for HTTPException to log detailed error info
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    # Log the full exception details for debugging
    if exc.status_code == 400 and "parsing the body" in str(exc.detail):
        logger.error(f"Body parsing error on {request.url.path}")
        logger.error(f"Content-Type: {request.headers.get('content-type')}")
        logger.error(f"Exception cause: {exc.__cause__}")
        if exc.__cause__:
            logger.error(f"Cause traceback: {''.join(traceback.format_exception(type(exc.__cause__), exc.__cause__, exc.__cause__.__traceback__))}")

    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )


# Debug middleware to log request bodies for purchase-requests endpoint
# NOTE: This middleware is disabled to avoid consuming the request body
# Uncomment for debugging if needed
# @app.middleware("http")
# async def debug_request_middleware(request: Request, call_next):
#     if "purchase-requests" in request.url.path and request.method in ["POST", "PUT"]:
#         # Read the body
#         body = await request.body()
#         logger.info(f"[DEBUG] Request to {request.url.path}")
#         logger.info(f"[DEBUG] Method: {request.method}")
#         logger.info(f"[DEBUG] Content-Type: {request.headers.get('content-type')}")
#         logger.info(f"[DEBUG] Body length: {len(body)} bytes")
#
#         # Try to parse as JSON to see if it's valid
#         if body:
#             try:
#                 body_str = body.decode('utf-8')
#                 logger.info(f"[DEBUG] Body (first 2000 chars): {body_str[:2000]}")
#                 parsed = json.loads(body_str)
#                 logger.info(f"[DEBUG] JSON parsed successfully")
#             except json.JSONDecodeError as e:
#                 logger.error(f"[DEBUG] JSON decode error: {e}")
#             except Exception as e:
#                 logger.error(f"[DEBUG] Error parsing body: {e}")
#         else:
#             logger.warning(f"[DEBUG] Empty body received!")
#
#         # Reconstruct request with body for downstream handlers
#         async def receive():
#             return {"type": "http.request", "body": body}
#
#         request = Request(request.scope, receive)
#
#     response = await call_next(request)
#     return response


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
app.include_router(brands.router, prefix="/api/brands", tags=["Brand Master"])
app.include_router(files.router, prefix="/api/files", tags=["File Management"])

# Variant Master routes
app.include_router(colours.router, prefix="/api", tags=["Colour Master"])
app.include_router(sizes.router, prefix="/api", tags=["Size Master"])
app.include_router(uoms.router, prefix="/api", tags=["UOM Master"])
app.include_router(variant_groups.router, prefix="/api", tags=["Variant Groups"])

# Specifications routes
app.include_router(specifications.router, prefix="/api", tags=["Specifications"])

# Purchase Management routes (new)
app.include_router(purchase.router, prefix="/api/purchase", tags=["Purchase Management"])
app.include_router(purchase_requests.router, prefix="/api/purchase", tags=["Purchase Requests"])

# Serve uploaded files statically
UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.get("/")
async def root():
    return {"message": "Inventory ERP API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
