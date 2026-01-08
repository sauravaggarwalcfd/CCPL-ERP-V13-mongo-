from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017')
db = client['ccpl_erp']

print("=== All Suppliers ===")
suppliers = list(db.supplier_master.find({}))
for s in suppliers:
    print(f"{s.get('company_name')} ({s.get('code')}): {s.get('item_categories', [])}")

print("\n=== Categories ===")
cats = list(db.item_categories.find({}))
for c in cats:
    print(f"{c.get('name')} -> {c.get('category_code')}")

print("\n=== SubCategories ===")
subcats = list(db.item_sub_categories.find({}))
for c in subcats:
    print(f"{c.get('name')} ({c.get('sub_category_code')}) -> parent: {c.get('category_code')}")

print("\n=== Divisions ===")
divs = list(db.item_divisions.find({}))
for d in divs:
    print(f"{d.get('name')} ({d.get('division_code')}) -> parent sub_cat: {d.get('sub_category_code')}, cat: {d.get('category_code')}")

client.close()
