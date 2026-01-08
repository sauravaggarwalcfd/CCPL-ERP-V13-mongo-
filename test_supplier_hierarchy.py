import requests

# Test the supplier API directly
BASE_URL = "http://localhost:8000"

print("=== Testing Supplier Hierarchy ===\n")

# Test 1: Get all suppliers
print("1. All Active Suppliers:")
response = requests.get(f"{BASE_URL}/api/suppliers/?skip=0&limit=100")
if response.status_code == 200:
    suppliers = response.json()
    for s in suppliers:
        print(f"   {s['company_name']} ({s['code']}): categories={s.get('item_categories', [])}")
else:
    print(f"   Error: {response.status_code}")

print("\n2. Fetching suppliers for TOPW (Topwear) category:")
response = requests.get(f"{BASE_URL}/api/specifications/TOPW/field-values/supplier_code")
if response.status_code == 200:
    data = response.json()
    print(f"   Found {len(data)} suppliers:")
    for opt in data:
        print(f"   - {opt['name']} ({opt['code']})")
else:
    print(f"   Error: {response.status_code} - {response.text}")

print("\n3. Category Hierarchy:")
response = requests.get(f"{BASE_URL}/api/hierarchy/categories?is_active=true")
if response.status_code == 200:
    cats = response.json()
    print(f"   Level 1 Categories: {[c['name'] + ' (' + c['category_code'] + ')' for c in cats]}")

response = requests.get(f"{BASE_URL}/api/hierarchy/sub-categories?is_active=true")
if response.status_code == 200:
    cats = response.json()
    print(f"   Level 2 SubCategories: {[c['name'] + ' (' + c['sub_category_code'] + ')' for c in cats[:3]]}")

response = requests.get(f"{BASE_URL}/api/hierarchy/divisions?is_active=true")
if response.status_code == 200:
    cats = response.json()
    print(f"   Level 3 Divisions: {[c['name'] + ' (' + c['division_code'] + ')' for c in cats[:3]]}")
