"""
Keep only 5 specific item types and remove all others
Run: python backend/cleanup_item_types.py
"""
import asyncio
from app.database import connect_to_mongo, close_mongo_connection
from app.models.item_type import ItemType

# Define the item types to keep
KEEP_TYPES = {
    "FP": {"name": "Finished Products", "allow_sale": True},
    "RM": {"name": "Raw Material", "allow_purchase": True},
    "SF": {"name": "Semi Finished", "allow_purchase": False, "allow_sale": False},
    "CS": {"name": "Consumables & Spares", "allow_purchase": True},
    "FB": {"name": "Fabric", "allow_purchase": True, "allow_sale": False},
}

async def main():
    await connect_to_mongo()
    
    print("Current item types in database:")
    all_types = await ItemType.find_all().to_list()
    for t in all_types:
        print(f"  {t.type_code}: {t.type_name}")
    
    print(f"\nTotal: {len(all_types)} item types")
    
    # Delete types not in KEEP_TYPES
    deleted_count = 0
    for t in all_types:
        if t.type_code not in KEEP_TYPES:
            await t.delete()
            print(f"  ✗ Deleted: {t.type_code} - {t.type_name}")
            deleted_count += 1
    
    print(f"\n✓ Deleted {deleted_count} item types")
    
    # Update/Create the types we want to keep
    print("\nEnsuring required item types exist:")
    for code, info in KEEP_TYPES.items():
        existing = await ItemType.find_one(ItemType.type_code == code)
        
        if existing:
            # Update if name is different
            if existing.type_name != info["name"]:
                existing.type_name = info["name"]
                await existing.save()
                print(f"  ✓ Updated: {code} - {info['name']}")
            else:
                print(f"  ✓ Exists: {code} - {info['name']}")
        else:
            # Create new
            new_type = ItemType(
                type_code=code,
                type_name=info["name"],
                description=f"{info['name']} for manufacturing",
                allow_purchase=info.get("allow_purchase", True),
                allow_sale=info.get("allow_sale", False),
                track_inventory=True,
                default_uom="PCS",
                color_code="#10b981",
                icon="Package",
                is_active=True,
            )
            await new_type.save()
            print(f"  ✓ Created: {code} - {info['name']}")
    
    print("\n" + "="*50)
    print("FINAL ITEM TYPES:")
    print("="*50)
    final_types = await ItemType.find_all().sort("type_code").to_list()
    for t in final_types:
        print(f"  {t.type_code}: {t.type_name}")
        print(f"    - Allow Purchase: {t.allow_purchase}")
        print(f"    - Allow Sale: {t.allow_sale}")
        print(f"    - Active: {t.is_active}")
    
    print(f"\n✓ Total: {len(final_types)} item types (as required)")
    
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(main())
