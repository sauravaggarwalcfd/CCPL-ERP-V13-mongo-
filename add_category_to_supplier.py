from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017')
db = client['ccpl_erp']

# Update first supplier to have APRL category
result = db.supplier_master.update_one(
    {"code": "SUP-001"},
    {"$set": {"item_categories": ["APRL"]}}
)

if result.modified_count > 0:
    supplier = db.supplier_master.find_one({"code": "SUP-001"})
    print(f"✅ Updated supplier: {supplier.get('company_name')}")
    print(f"   Code: {supplier.get('code')}")
    print(f"   Item Categories: {supplier.get('item_categories')}")
else:
    print("❌ No supplier found with code SUP-001")

client.close()
