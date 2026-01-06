"""
Check Variant Configuration
Verifies that variant masters and groups exist, and checks category specifications
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
import os
from dotenv import load_dotenv

load_dotenv()

async def check_variants():
    """Check variant configuration"""
    
    # Import models
    from app.models.uom_master import UOMMaster
    from app.models.size_master import SizeMaster
    from app.models.colour_master import ColourMaster
    from app.models.specifications import CategorySpecifications
    from app.models.category_hierarchy import ItemCategory
    
    # Connect to MongoDB
    mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    database_name = os.getenv("DATABASE_NAME", "ccpl_erp")
    
    client = AsyncIOMotorClient(mongo_uri)
    
    # Initialize Beanie
    await init_beanie(
        database=client[database_name],
        document_models=[
            UOMMaster,
            SizeMaster,
            ColourMaster,
            CategorySpecifications,
            ItemCategory
        ]
    )
    
    print("\n" + "="*70)
    print("VARIANT CONFIGURATION CHECK")
    print("="*70)
    
    # Check UOM Groups
    print("\n📦 UOM GROUPS:")
    uoms = await UOMMaster.find_all().to_list()
    uom_groups = {}
    for uom in uoms:
        group = uom.uom_group or "NO_GROUP"
        if group not in uom_groups:
            uom_groups[group] = []
        uom_groups[group].append(f"{uom.uom_code} - {uom.uom_name}")
    
    for group, items in uom_groups.items():
        print(f"\n  Group: {group}")
        for item in items:
            print(f"    - {item}")
    
    print(f"\n  Total UOMs: {len(uoms)}")
    print(f"  Total Groups: {len(uom_groups)}")
    
    # Check Size Groups
    print("\n📏 SIZE GROUPS:")
    sizes = await SizeMaster.find_all().to_list()
    size_groups = {}
    for size in sizes:
        group = size.size_group or "NO_GROUP"
        if group not in size_groups:
            size_groups[group] = []
        size_groups[group].append(f"{size.size_code} - {size.size_name}")
    
    for group, items in size_groups.items():
        print(f"\n  Group: {group}")
        for item in items:
            print(f"    - {item}")
    
    print(f"\n  Total Sizes: {len(sizes)}")
    print(f"  Total Groups: {len(size_groups)}")
    
    # Check Colour Groups
    print("\n🎨 COLOUR GROUPS:")
    colours = await ColourMaster.find_all().to_list()
    colour_groups = {}
    for colour in colours:
        group = colour.colour_group or "NO_GROUP"
        if group not in colour_groups:
            colour_groups[group] = []
        colour_groups[group].append(f"{colour.colour_code} - {colour.colour_name} ({colour.colour_hex})")
    
    for group, items in colour_groups.items():
        print(f"\n  Group: {group}")
        for item in items:
            print(f"    - {item}")
    
    print(f"\n  Total Colours: {len(colours)}")
    print(f"  Total Groups: {len(colour_groups)}")
    
    # Check Categories
    print("\n📁 CATEGORIES:")
    categories = await ItemCategory.find_all().to_list()
    print(f"  Total Categories: {len(categories)}")
    
    for cat in categories:
        print(f"\n  Category: {cat.code} - {cat.name}")
        print(f"    - has_color: {cat.has_color}")
        print(f"    - has_size: {cat.has_size}")
        print(f"    - has_fabric: {cat.has_fabric}")
    
    # Check Category Specifications
    print("\n⚙️  CATEGORY SPECIFICATIONS:")
    specs = await CategorySpecifications.find_all().to_list()
    print(f"  Total Specifications Configured: {len(specs)}")
    
    if specs:
        for spec in specs:
            print(f"\n  Category: {spec.category_code} - {spec.category_name}")
            
            if spec.specifications:
                if spec.specifications.colour and spec.specifications.colour.enabled:
                    print(f"    - Colour: ENABLED")
                    print(f"      Groups: {spec.specifications.colour.groups}")
                
                if spec.specifications.size and spec.specifications.size.enabled:
                    print(f"    - Size: ENABLED")
                    print(f"      Groups: {spec.specifications.size.groups}")
                
                if spec.specifications.uom and spec.specifications.uom.enabled:
                    print(f"    - UOM: ENABLED")
                    print(f"      Groups: {spec.specifications.uom.groups}")
    else:
        print("\n  ⚠️  No category specifications found!")
        print("  This means no categories have been configured with variant groups yet.")
        print("  To configure:")
        print("    1. Go to Item Category Master")
        print("    2. Create or Edit a category")
        print("    3. Scroll to 'Specifications Configuration'")
        print("    4. Enable Colour/Size/UOM variants")
        print("    5. Select which groups apply to this category")
    
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    print(f"✓ Variant Masters Created: {len(colours)} colours, {len(sizes)} sizes, {len(uoms)} UOMs")
    print(f"✓ Variant Groups Available: {len(colour_groups)} colour groups, {len(size_groups)} size groups, {len(uom_groups)} UOM groups")
    print(f"✓ Categories Created: {len(categories)}")
    print(f"{'✓' if specs else '⚠️'} Category Specifications Configured: {len(specs)}")
    
    if not specs:
        print("\n💡 ACTION REQUIRED:")
        print("   Configure variant groups for your categories in the UI!")
        print("   The variant system is ready, just needs to be linked to categories.")
    else:
        print("\n✅ Variant system is fully configured and connected!")
    
    print("="*70 + "\n")

if __name__ == "__main__":
    asyncio.run(check_variants())
