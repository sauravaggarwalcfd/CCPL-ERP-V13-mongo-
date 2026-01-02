"""Test full SKU generation endpoint"""
import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_full_sku():
    print("=" * 80)
    print("Testing Full SKU Generation")
    print("=" * 80)
    
    # Test 1: Generate full SKU with all components
    print("\n1. Generate Full SKU with color and size:")
    try:
        params = {
            "item_type_code": "FG",
            "category_code": "RNCK",
            "color": "Navy",
            "size": "Medium"
        }
        response = requests.get(f"{BASE_URL}/items/generate-full-sku", params=params, timeout=5)
        print(f"   Status: {response.status_code}")
        data = response.json()
        print(f"   SKU: {data.get('sku')}")
        print(f"   Components: {json.dumps(data.get('components'), indent=4)}")
        print(f"   Display: {data.get('display')}")
    except Exception as e:
        print(f"   ERROR: {e}")
    
    # Test 2: Generate SKU without variants
    print("\n2. Generate Full SKU without variants:")
    try:
        params = {
            "item_type_code": "RM",
            "category_code": "APRL",
        }
        response = requests.get(f"{BASE_URL}/items/generate-full-sku", params=params, timeout=5)
        print(f"   Status: {response.status_code}")
        data = response.json()
        print(f"   SKU: {data.get('sku')}")
        print(f"   Components: {json.dumps(data.get('components'), indent=4)}")
    except Exception as e:
        print(f"   ERROR: {e}")
    
    # Test 3: Generate multiple SKUs to check sequence increment
    print("\n3. Generate multiple SKUs (sequence increment):")
    try:
        for i in range(3):
            params = {
                "item_type_code": "FG",
                "category_code": "RNCK",
                "color": "Red",
                "size": "L"
            }
            response = requests.get(f"{BASE_URL}/items/generate-full-sku", params=params, timeout=5)
            data = response.json()
            print(f"   SKU {i+1}: {data.get('sku')} (Sequence: {data.get('next_sequence_number')})")
    except Exception as e:
        print(f"   ERROR: {e}")
    
    print("\n" + "=" * 80)

if __name__ == "__main__":
    test_full_sku()
