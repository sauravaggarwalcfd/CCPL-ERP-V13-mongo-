"""
Fix inactive item types by reactivating all seeded types
Run: python backend/fix_item_types.py
"""
import asyncio
from app.database import connect_to_mongo, close_mongo_connection
from app.models.item_type import ItemType

async def main():
    await connect_to_mongo()
    
    print("Checking item types status...")
    all_types = await ItemType.find_all().to_list()
    
    inactive_types = [t for t in all_types if not t.is_active]
    
    if not inactive_types:
        print("✓ All item types are already active!")
    else:
        print(f"\nFound {len(inactive_types)} inactive item types:")
        for t in inactive_types:
            print(f"  - {t.type_code}: {t.type_name}")
        
        print("\nReactivating them...")
        for t in inactive_types:
            t.is_active = True
            await t.save()
            print(f"  ✓ Activated {t.type_code}")
        
        print(f"\n✓ Successfully reactivated {len(inactive_types)} item types!")
    
    print("\nFinal status:")
    all_types = await ItemType.find_all().to_list()
    for t in all_types:
        status = "✓ ACTIVE" if t.is_active else "✗ INACTIVE"
        print(f"  {t.type_code}: {t.type_name} - {status}")
    
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(main())
