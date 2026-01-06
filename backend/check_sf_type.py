import asyncio
from app.database import connect_to_mongo, close_mongo_connection
from app.models.item_type import ItemType

async def main():
    await connect_to_mongo()
    
    # Get all item types
    all_types = await ItemType.find_all().to_list()
    print(f"Total item types: {len(all_types)}")
    print("\nAll item types:")
    for it in all_types:
        print(f"  {it.type_code}: {it.type_name} - is_active={it.is_active}")
    
    # Check for SF specifically
    sf = await ItemType.find_one(ItemType.type_code == "SF")
    if sf:
        print(f"\n✓ SF item type found:")
        print(f"  Code: {sf.type_code}")
        print(f"  Name: {sf.type_name}")
        print(f"  is_active: {sf.is_active}")
        print(f"  Description: {sf.description}")
    else:
        print("\n✗ SF item type NOT found in database")
    
    await close_mongo_connection()

asyncio.run(main())
