import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check_data():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['ccpl_erp']
    
    print("\n=== ABC Textile Supplier Data ===")
    suppliers = await db.supplier_master.find({'company_name': {'$regex': 'ABC', '$options': 'i'}}).to_list(None)
    for supplier in suppliers:
        print(f"Company: {supplier.get('company_name')}")
        print(f"Code: {supplier.get('code')}")
        print(f"Item Categories: {supplier.get('item_categories', [])}")
        print()
    
    print("\n=== All Suppliers with Categories ===")
    all_suppliers = await db.supplier_master.find({}).to_list(None)
    for supplier in all_suppliers:
        cats = supplier.get('item_categories', [])
        print(f"{supplier.get('company_name')} ({supplier.get('code')}): {cats}")
    
    print("\n=== Category Codes ===")
    print("ItemCategories:")
    categories = await db.item_categories.find({}).to_list(None)
    for cat in categories:
        print(f"  {cat.get('category_code')} - {cat.get('name')}")
    
    print("\nItemSubCategories:")
    sub_cats = await db.item_sub_categories.find({}).to_list(None)
    for cat in sub_cats:
        print(f"  {cat.get('sub_category_code')} (parent: {cat.get('category_code')}) - {cat.get('name')}")
    
    print("\nItemDivisions:")
    divs = await db.item_divisions.find({}).to_list(None)
    for div in divs:
        print(f"  {div.get('division_code')} (parent: {div.get('sub_category_code')}) - {div.get('name')}")
    
    await client.close()

if __name__ == "__main__":
    asyncio.run(check_data())
