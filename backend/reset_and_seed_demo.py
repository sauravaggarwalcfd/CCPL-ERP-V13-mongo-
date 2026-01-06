"""Reset all MongoDB collections except users, then seed a connected demo dataset.

Usage (from repo root):
  python backend/reset_and_seed_demo.py

Respects backend/app/config.py settings (env file supported):
  MONGODB_URL, DATABASE_NAME

Safety:
- Preserves the `users` collection as-is (passwords untouched)
- Drops all other non-system collections and rebuilds a minimal connected dataset
"""

import asyncio
import os
from datetime import date
from typing import Iterable, Set

from motor.motor_asyncio import AsyncIOMotorClient


async def drop_collections_except(db, keep: Set[str]) -> None:
    collections = await db.list_collection_names()
    for name in collections:
        if name.startswith("system."):
            continue
        if name in keep:
            continue
        await db.drop_collection(name)


async def seed_demo_data() -> None:
    # Import inside function so env vars are loaded before Settings instantiates
    from app.config import settings
    from app.database import connect_to_mongo, close_mongo_connection

    from app.models.user import User
    from app.models.role import Role, Permission

    from app.models.item_type import ItemType
    from app.models.category_hierarchy import (
        ItemCategory,
        ItemSubCategory,
        ItemDivision,
        ItemClass,
        ItemSubClass,
    )
    from app.models.uom_master import UOMMaster
    from app.models.size_master import SizeMaster
    from app.models.colour_master import ColourMaster, hex_to_rgb
    from app.models.variant_groups import VariantGroup, VARIANT_GROUPS_SEED

    from app.models.supplier_master import SupplierGroup, SupplierMaster
    from app.models.brand_master import BrandGroup, BrandMaster

    from app.models.item import ItemMaster
    from app.models.inventory_management import InventoryStock

    from app.models.purchase_request import PurchaseRequest, PRLineItem, PRStatus, PRPriority

    # Connect with motor for dropping collections
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]

    keep = {"users"}
    await drop_collections_except(db, keep=keep)

    # Initialize Beanie (recreates indexes)
    await connect_to_mongo()

    try:
        # Find a requester user (preserved)
        requester = await User.find_one()
        requester_by = requester.email if requester else "system"
        requester_name = requester.full_name if requester else "System"

        # -------------------- Roles & Permissions --------------------
        permissions = [
            ("items.view", "items", "view", "View Items"),
            ("items.create", "items", "create", "Create Items"),
            ("suppliers.view", "suppliers", "view", "View Suppliers"),
            ("brands.view", "brands", "view", "View Brands"),
            ("purchase_requests.view", "purchase_requests", "view", "View Purchase Requests"),
            ("purchase_requests.create", "purchase_requests", "create", "Create Purchase Requests"),
        ]
        for code, module, action, name in permissions:
            existing = await Permission.find_one(Permission.code == code)
            if not existing:
                await Permission(
                    code=code,
                    module=module,
                    action=action,
                    name=name,
                    is_system=True,
                    is_active=True,
                ).insert()

        all_codes = [p[0] for p in permissions]
        for role_name, slug, level in [
            ("Super Admin", "super-admin", 100),
            ("Admin", "admin", 90),
            ("Manager", "manager", 70),
            ("Staff", "staff", 50),
            ("Viewer", "viewer", 30),
        ]:
            existing = await Role.find_one(Role.slug == slug)
            if not existing:
                await Role(
                    name=role_name,
                    slug=slug,
                    level=level,
                    permission_codes=all_codes,
                    is_system=True,
                    is_active=True,
                    created_by={"seed": True},
                ).insert()

        # -------------------- Item Types (Only 5 Required Types) --------------------
        required_item_types = [
            {"type_code": "FP", "type_name": "Finished Products", "description": "Finished Products", "color_code": "#10b981", "icon": "Package"},
            {"type_code": "RM", "type_name": "Raw Material", "description": "Raw Material", "color_code": "#f59e0b", "icon": "Box"},
            {"type_code": "SF", "type_name": "Semi Finished", "description": "Semi Finished", "color_code": "#3b82f6", "icon": "Layers"},
            {"type_code": "CS", "type_name": "Consumables & Spares", "description": "Consumables and Spares", "color_code": "#8b5cf6", "icon": "Wrench"},
            {"type_code": "FB", "type_name": "Fabric", "description": "Fabric", "color_code": "#ec4899", "icon": "Shirt"},
        ]
        
        for it in required_item_types:
            existing = await ItemType.find_one(ItemType.type_code == it["type_code"])
            if not existing:
                await ItemType(**it, created_by=requester_by).insert()

        # -------------------- Hierarchy (5 levels) --------------------
        # Category
        cat = await ItemCategory.find_one(ItemCategory.category_code == "APRL")
        if not cat:
            cat = await ItemCategory(
                category_code="APRL",
                category_name="Apparel",
                description="Apparel category",
                item_type="FG",
                default_uom="PCS",
                created_by=requester_by,
            ).insert()

        # Sub-category
        sub = await ItemSubCategory.find_one(ItemSubCategory.sub_category_code == "MENS")
        if not sub:
            sub = await ItemSubCategory(
                sub_category_code="MENS",
                sub_category_name="Mens",
                category_code="APRL",
                category_name="Apparel",
                path="APRL/MENS",
                path_name="Apparel > Mens",
                item_type="FG",
                created_by=requester_by,
            ).insert()

        # Division
        div = await ItemDivision.find_one(ItemDivision.division_code == "TOPW")
        if not div:
            div = await ItemDivision(
                division_code="TOPW",
                division_name="Topwear",
                category_code="APRL",
                category_name="Apparel",
                sub_category_code="MENS",
                sub_category_name="Mens",
                path="APRL/MENS/TOPW",
                path_name="Apparel > Mens > Topwear",
                item_type="FG",
                created_by=requester_by,
            ).insert()

        # Class
        cls = await ItemClass.find_one(ItemClass.class_code == "TSHT")
        if not cls:
            cls = await ItemClass(
                class_code="TSHT",
                class_name="T-Shirts",
                category_code="APRL",
                category_name="Apparel",
                sub_category_code="MENS",
                sub_category_name="Mens",
                division_code="TOPW",
                division_name="Topwear",
                path="APRL/MENS/TOPW/TSHT",
                path_name="Apparel > Mens > Topwear > T-Shirts",
                item_type="FG",
                created_by=requester_by,
            ).insert()

        # Sub-class
        subcls = await ItemSubClass.find_one(ItemSubClass.sub_class_code == "RNCK")
        if not subcls:
            subcls = await ItemSubClass(
                sub_class_code="RNCK",
                sub_class_name="Round Neck",
                category_code="APRL",
                category_name="Apparel",
                sub_category_code="MENS",
                sub_category_name="Mens",
                division_code="TOPW",
                division_name="Topwear",
                class_code="TSHT",
                class_name="T-Shirts",
                path="APRL/MENS/TOPW/TSHT/RNCK",
                path_name="Apparel > Mens > Topwear > T-Shirts > Round Neck",
                item_type="FG",
                sku_prefix="RNCK",
                created_by=requester_by,
            ).insert()

        # -------------------- Masters: UOM / Size / Colour --------------------
        pcs = await UOMMaster.find_one(UOMMaster.uom_code == "PCS")
        if not pcs:
            pcs = await UOMMaster(
                uom_code="PCS",
                uom_name="Pieces",
                uom_group="COUNT",
                group_name="Count Units",
                uom_symbol="pcs",
                conversion_to_base=1.0,
                is_base_uom=True,
                created_by=requester_by,
            ).insert()

        sizes = [
            ("S", "Small", 1),
            ("M", "Medium", 2),
            ("L", "Large", 3),
        ]
        for code, name, order in sizes:
            existing = await SizeMaster.find_one(SizeMaster.size_code == code)
            if not existing:
                await SizeMaster(
                    size_code=code,
                    size_name=name,
                    size_group="APPAREL_SIZES",
                    group_name="Apparel Sizes",
                    display_order=order,
                    created_by=requester_by,
                ).insert()

        colours = [
            ("BLK", "Black", "#000000", "FABRIC_COLORS", 1),
            ("WHT", "White", "#FFFFFF", "FABRIC_COLORS", 2),
            ("BLU", "Blue", "#2563EB", "FABRIC_COLORS", 3),
        ]
        for code, name, hex_colour, group, order in colours:
            existing = await ColourMaster.find_one(ColourMaster.colour_code == code)
            if not existing:
                await ColourMaster(
                    colour_code=code,
                    colour_name=name,
                    colour_hex=hex_colour,
                    rgb_value=hex_to_rgb(hex_colour),
                    colour_groups=[group],
                    colour_group=group,
                    group_name="Fabric Colors" if group == "FABRIC_COLORS" else group,
                    display_order=order,
                    created_by=requester_by,
                ).insert()

        # -------------------- Variant Groups --------------------
        # Seed variant groups for organizing colours, sizes, and UOMs
        for vg_data in VARIANT_GROUPS_SEED:
            existing_vg = await VariantGroup.find_one(
                VariantGroup.group_code == vg_data["group_code"],
                VariantGroup.variant_type == vg_data["variant_type"]
            )
            if not existing_vg:
                await VariantGroup(**vg_data).insert()
        
        print(f"✓ Seeded {len(VARIANT_GROUPS_SEED)} variant groups")

        # -------------------- Supplier Groups & Suppliers --------------------
        sup_group = await SupplierGroup.find_one(SupplierGroup.group_code == "TEXTILE_SUPPLIERS")
        if not sup_group:
            sup_group = await SupplierGroup(
                group_code="TEXTILE_SUPPLIERS",
                group_name="Textile Suppliers",
                description="Demo supplier group",
            ).insert()

        suppliers = [
            ("SUP-001", "ABC Textiles", "Delhi"),
            ("SUP-002", "XYZ Fabrics", "Mumbai"),
        ]
        for code, name, city in suppliers:
            existing = await SupplierMaster.find_one(SupplierMaster.supplier_code == code)
            if not existing:
                await SupplierMaster(
                    supplier_code=code,
                    supplier_name=name,
                    supplier_groups=["TEXTILE_SUPPLIERS"],
                    supplier_group_code="TEXTILE_SUPPLIERS",
                    supplier_type="Textile Supplier",
                    country="India",
                    city=city,
                    payment_terms="Net 30",
                ).insert()

        # -------------------- Brand Groups & Brands --------------------
        br_group = await BrandGroup.find_one(BrandGroup.group_code == "PREMIUM_BRANDS")
        if not br_group:
            br_group = await BrandGroup(
                group_code="PREMIUM_BRANDS",
                group_name="Premium Brands",
                description="Demo brand group",
            ).insert()

        brands = [
            ("BR-001", "Alpha Apparel"),
            ("BR-002", "Beta Basics"),
        ]
        for code, name in brands:
            existing = await BrandMaster.find_one(BrandMaster.brand_code == code)
            if not existing:
                await BrandMaster(
                    brand_code=code,
                    brand_name=name,
                    brand_groups=["PREMIUM_BRANDS"],
                    brand_group="PREMIUM_BRANDS",
                    brand_category="Textile",
                    country="India",
                ).insert()

        # -------------------- Items & Inventory Stock --------------------
        # Use simple string refs (UI expects these as strings)
        demo_items = [
            {
                "item_code": "TSHIRT-RNCK-BLK-M",
                "item_name": "Mens Round Neck T-Shirt - Black (M)",
                "category_code": "APRL",
                "category_name": "Apparel",
                "sub_category_code": "MENS",
                "sub_category_name": "Mens",
                "division_code": "TOPW",
                "division_name": "Topwear",
                "class_code": "TSHT",
                "class_name": "T-Shirts",
                "sub_class_code": "RNCK",
                "sub_class_name": "Round Neck",
                "color_id": "BLK",
                "color_name": "Black",
                "size_id": "M",
                "size_name": "Medium",
                "brand_id": "BR-001",
                "brand_name": "Alpha Apparel",
                "supplier_id": "SUP-001",
                "supplier_name": "ABC Textiles",
                "uom": "PCS",
                "cost_price": 220.0,
                "selling_price": 399.0,
                "mrp": 499.0,
                "gst_rate": 5.0,
            },
            {
                "item_code": "TSHIRT-RNCK-WHT-L",
                "item_name": "Mens Round Neck T-Shirt - White (L)",
                "category_code": "APRL",
                "category_name": "Apparel",
                "sub_category_code": "MENS",
                "sub_category_name": "Mens",
                "division_code": "TOPW",
                "division_name": "Topwear",
                "class_code": "TSHT",
                "class_name": "T-Shirts",
                "sub_class_code": "RNCK",
                "sub_class_name": "Round Neck",
                "color_id": "WHT",
                "color_name": "White",
                "size_id": "L",
                "size_name": "Large",
                "brand_id": "BR-002",
                "brand_name": "Beta Basics",
                "supplier_id": "SUP-002",
                "supplier_name": "XYZ Fabrics",
                "uom": "PCS",
                "cost_price": 210.0,
                "selling_price": 379.0,
                "mrp": 479.0,
                "gst_rate": 5.0,
            },
        ]

        for it in demo_items:
            existing = await ItemMaster.find_one(ItemMaster.item_code == it["item_code"])
            if not existing:
                await ItemMaster(
                    **it,
                    hierarchy_path="APRL/MENS/TOPW/TSHT/RNCK",
                    hierarchy_path_name="Apparel > Mens > Topwear > T-Shirts > Round Neck",
                    created_by=requester_by,
                ).insert()

            stock = await InventoryStock.find_one(InventoryStock.item_code == it["item_code"])
            if not stock:
                opening = 50
                unit_cost = float(it.get("cost_price") or 0)
                await InventoryStock(
                    item_code=it["item_code"],
                    item_name=it["item_name"],
                    opening_stock=opening,
                    current_stock=opening,
                    reserved_stock=0,
                    available_stock=opening,
                    unit_cost=unit_cost,
                    total_value=opening * unit_cost,
                    last_movement_date=None,
                ).insert()

        # -------------------- Purchase Request with recommendations --------------------
        pr_code = "PR-DEMO-0001"
        existing_pr = await PurchaseRequest.find_one(PurchaseRequest.pr_code == pr_code)
        if not existing_pr:
            pr = PurchaseRequest(
                pr_code=pr_code,
                pr_date=date.today(),
                requested_by=requester_by,
                requested_by_name=requester_name,
                department="Purchase",
                priority=PRPriority.NORMAL,
                purpose="Demo purchase request",
                justification="Seeded demo data",
                items=[
                    PRLineItem(
                        line_number=1,
                        item_code=demo_items[0]["item_code"],
                        item_name=demo_items[0]["item_name"],
                        quantity=25,
                        unit="PCS",
                        estimated_unit_rate=demo_items[0]["cost_price"],
                        estimated_amount=25 * demo_items[0]["cost_price"],
                        suggested_supplier_code="SUP-001",
                        suggested_supplier_name="ABC Textiles",
                        suggested_brand_code="BR-001",
                        suggested_brand_name="Alpha Apparel",
                        notes="Seeded with recommended supplier & brand",
                    ),
                    PRLineItem(
                        line_number=2,
                        item_code=demo_items[1]["item_code"],
                        item_name=demo_items[1]["item_name"],
                        quantity=20,
                        unit="PCS",
                        estimated_unit_rate=demo_items[1]["cost_price"],
                        estimated_amount=20 * demo_items[1]["cost_price"],
                        suggested_supplier_code="SUP-002",
                        suggested_supplier_name="XYZ Fabrics",
                        suggested_brand_code="BR-002",
                        suggested_brand_name="Beta Basics",
                    ),
                ],
                status=PRStatus.DRAFT,
                created_by=requester_by,
            )
            pr.calculate_totals()
            await pr.insert()

    finally:
        await close_mongo_connection()
        client.close()


def main() -> None:
    # Allow env overrides when running directly
    # (config.py already reads .env; this is just a convenience)
    if os.getenv("PYTHONUNBUFFERED") is None:
        os.environ["PYTHONUNBUFFERED"] = "1"

    asyncio.run(seed_demo_data())


if __name__ == "__main__":
    main()
