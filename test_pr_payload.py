"""
Test script to validate PR payload structure and test the API
"""
import json
from datetime import date
import requests

# Test payload structure - mimics what the frontend is sending
test_payload = {
    "pr_date": "2026-01-12",
    "department": "test",
    "priority": "HIGH",
    "required_by_date": "2026-01-14",
    "purpose": "Button required for T Shirts",
    "justification": "asdasda",
    "notes": "asdads",
    "items": [
        {
            "item_code": None,
            "item_name": "test-button 02",
            "item_description": "",
            "item_category": "Trims & Accessories",
            "category_path": "Trims & Accessories > Buttons",
            "category_code": None,
            "sub_category_code": None,
            "division_code": None,
            "class_code": None,
            "sub_class_code": None,
            "quantity": 20,
            "unit": "PCS",
            "estimated_unit_rate": 75,
            "required_date": None,
            "colour_code": "WHT",
            "size_code": "3M",
            "uom_code": None,
            "suggested_supplier_code": None,
            "suggested_supplier_name": None,
            "suggested_brand_code": None,
            "suggested_brand_name": None,
            "specifications": {},
            "notes": "",
            "is_new_item": False
        }
    ]
}

# Test 1: Validate JSON serialization
print("Test 1: JSON Serialization")
try:
    json_str = json.dumps(test_payload)
    print("✓ Payload is JSON serializable")
    print(f"  Size: {len(json_str)} bytes")
except Exception as e:
    print(f"✗ Serialization failed: {e}")
    exit(1)

# Test 2: Validate field types
print("\nTest 2: Field Type Validation")
errors = []

# Check main fields
if not isinstance(test_payload['pr_date'], str):
    errors.append(f"pr_date should be str, got {type(test_payload['pr_date'])}")
if not isinstance(test_payload['priority'], str):
    errors.append(f"priority should be str, got {type(test_payload['priority'])}")
if not isinstance(test_payload['items'], list):
    errors.append(f"items should be list, got {type(test_payload['items'])}")

# Check item fields
if test_payload['items']:
    item = test_payload['items'][0]
    if not isinstance(item['item_name'], str):
        errors.append(f"item_name should be str, got {type(item['item_name'])}")
    if not isinstance(item['quantity'], (int, float)):
        errors.append(f"quantity should be number, got {type(item['quantity'])}")
    if item['quantity'] <= 0:
        errors.append(f"quantity should be > 0, got {item['quantity']}")

if errors:
    print("✗ Type validation failed:")
    for err in errors:
        print(f"  - {err}")
    exit(1)
else:
    print("✓ All field types are correct")

# Test 3: Check for None/null values in required fields
print("\nTest 3: Required Fields Check")
required_fields = ['pr_date', 'items', 'priority']
for field in required_fields:
    if test_payload.get(field) is None:
        print(f"✗ Required field '{field}' is None")
        exit(1)

if not test_payload['items'] or len(test_payload['items']) == 0:
    print("✗ At least one item is required")
    exit(1)

for i, item in enumerate(test_payload['items']):
    if not item.get('item_name') or item.get('item_name').strip() == '':
        print(f"✗ Item {i}: item_name is required")
        exit(1)
    if not item.get('quantity') or item.get('quantity') <= 0:
        print(f"✗ Item {i}: quantity must be > 0")
        exit(1)

print("✓ All required fields present and valid")

# Test 4: Print payload structure
print("\nTest 4: Payload Structure")
print(json.dumps(test_payload, indent=2))

print("\n✓ All tests passed!")
print("\nNow testing with actual backend API...")

# Test 5: Try the actual API request
try:
    # You might need to adjust the URL based on your setup
    API_URL = "http://localhost:8000/api/purchase/purchase-requests"
    
    headers = {
        "Content-Type": "application/json",
        # Add your auth token here if needed
        # "Authorization": "Bearer YOUR_TOKEN"
    }
    
    print(f"\nPOST {API_URL}")
    response = requests.post(API_URL, json=test_payload, headers=headers, timeout=5)
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 201:
        print("\n✓ Purchase Request created successfully!")
    else:
        print(f"\n✗ Request failed: {response.text}")
        
except requests.exceptions.ConnectionError:
    print("\n⚠ Backend server not running on localhost:8000")
    print("Please start the backend server first")
except Exception as e:
    print(f"\n✗ Error: {e}")
