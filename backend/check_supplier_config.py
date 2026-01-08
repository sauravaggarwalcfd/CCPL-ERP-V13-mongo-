"""
Quick check script to see supplier field status for categories
"""
import asyncio
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.models.specifications import CategorySpecifications
from app.models.supplier_master import SupplierMaster

async def check_supplier_setup():
    """Check supplier field configuration and supplier-category links"""
    
    # Connect to MongoDB
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.ccpl_erp
    
    # Initialize Beanie
    await init_beanie(
        database=db,
        document_models=[CategorySpecifications, SupplierMaster]
    )
    
    print("=" * 70)
    print("SUPPLIER FIELD STATUS CHECK")
    print("=" * 70)
    
    # Check specifications
    specs = await CategorySpecifications.find().to_list()
    print(f"\n📋 Category Specifications: {len(specs)} found")
    print("-" * 70)
    
    for spec in specs:
        has_supplier = hasattr(spec.specifications, 'supplier') and spec.specifications.supplier is not None
        if has_supplier:
            enabled = spec.specifications.supplier.enabled
            required = spec.specifications.supplier.required
            status = "✅ ENABLED" if enabled else "❌ DISABLED"
            req_text = " (Required)" if required else ""
            print(f"{status}{req_text:12} | {spec.category_code:10} | {spec.category_name}")
        else:
            print(f"❌ NO CONFIG | {spec.category_code:10} | {spec.category_name}")
    
    # Check suppliers with categories
    print(f"\n👥 Suppliers: ")
    print("-" * 70)
    suppliers = await SupplierMaster.find(SupplierMaster.is_active == True).to_list()
    
    suppliers_with_categories = []
    suppliers_without_categories = []
    
    for supplier in suppliers:
        categories = getattr(supplier, 'item_categories', []) or []
        if categories:
            suppliers_with_categories.append((supplier.supplier_name, categories))
        else:
            suppliers_without_categories.append(supplier.supplier_name)
    
    print(f"\n✅ Suppliers WITH category assignments: {len(suppliers_with_categories)}")
    for name, cats in suppliers_with_categories:
        print(f"   • {name:30} → {', '.join(cats)}")
    
    print(f"\n⚠️  Suppliers WITHOUT categories (available for all): {len(suppliers_without_categories)}")
    for name in suppliers_without_categories:
        print(f"   • {name}")
    
    print("\n" + "=" * 70)
    print("RECOMMENDATIONS:")
    print("=" * 70)
    
    if not specs:
        print("❌ No category specifications found!")
        print("   → Run: python backend/enable_supplier_field.py")
    else:
        disabled_count = sum(1 for s in specs 
                           if not hasattr(s.specifications, 'supplier') 
                           or not s.specifications.supplier 
                           or not s.specifications.supplier.enabled)
        if disabled_count > 0:
            print(f"⚠️  {disabled_count} categories have supplier field disabled")
            print("   → Run: python backend/enable_supplier_field.py")
    
    if len(suppliers_without_categories) == len(suppliers):
        print("⚠️  No suppliers have category assignments!")
        print("   → Go to Supplier Master and assign categories to suppliers")
    
    print("\n")

if __name__ == "__main__":
    asyncio.run(check_supplier_setup())
