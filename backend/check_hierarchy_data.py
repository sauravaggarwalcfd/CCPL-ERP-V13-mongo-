import asyncio
from app.database import connect_to_mongo, close_mongo_connection
from app.models.category_hierarchy import (
    ItemCategory, ItemSubCategory, ItemDivision, ItemClass, ItemSubClass
)

async def main():
    await connect_to_mongo()
    
    cats = await ItemCategory.find_all().to_list()
    subs = await ItemSubCategory.find_all().to_list()
    divs = await ItemDivision.find_all().to_list()
    clss = await ItemClass.find_all().to_list()
    subcls = await ItemSubClass.find_all().to_list()
    
    print("\n=== CATEGORY HIERARCHY DATA ===")
    print(f"\nLevel 1 (Categories): {len(cats)}")
    for c in cats:
        print(f"  - {c.category_code}: {c.category_name}")
    
    print(f"\nLevel 2 (Sub-Categories): {len(subs)}")
    for s in subs:
        print(f"  - {s.sub_category_code}: {s.sub_category_name} (parent: {s.category_code})")
    
    print(f"\nLevel 3 (Divisions): {len(divs)}")
    for d in divs:
        print(f"  - {d.division_code}: {d.division_name} (parent: {d.sub_category_code})")
    
    print(f"\nLevel 4 (Classes): {len(clss)}")
    for c in clss:
        print(f"  - {c.class_code}: {c.class_name} (parent: {c.division_code})")
    
    print(f"\nLevel 5 (Sub-Classes): {len(subcls)}")
    for s in subcls:
        print(f"  - {s.sub_class_code}: {s.sub_class_name} (parent: {s.class_code})")
    
    print(f"\n=== TOTAL: {len(cats) + len(subs) + len(divs) + len(clss) + len(subcls)} items ===\n")
    
    await close_mongo_connection()

asyncio.run(main())
