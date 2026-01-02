"""Test Category API endpoints"""
import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_apis():
    print("=" * 60)
    print("Testing Category Hierarchy APIs")
    print("=" * 60)
    
    # Test 1: Check if backend is alive
    print("\n1. Health Check:")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"   ERROR: {e}")
    
    # Test 2: Get tree
    print("\n2. Get Category Tree:")
    try:
        response = requests.get(f"{BASE_URL}/hierarchy/tree", timeout=5)
        print(f"   Status: {response.status_code}")
        data = response.json()
        if isinstance(data, list):
            print(f"   Found {len(data)} root categories")
            if data:
                print(f"   First item: {json.dumps(data[0], indent=2, default=str)}")
        else:
            print(f"   Response: {json.dumps(data, indent=2, default=str)}")
    except Exception as e:
        print(f"   ERROR: {e}")
    
    # Test 3: Get categories
    print("\n3. Get Categories (Level 1):")
    try:
        response = requests.get(f"{BASE_URL}/hierarchy/categories", timeout=5)
        print(f"   Status: {response.status_code}")
        data = response.json()
        if isinstance(data, list):
            print(f"   Found {len(data)} categories")
            if data:
                print(f"   First item: {json.dumps(data[0], indent=2, default=str)}")
        else:
            print(f"   Response: {json.dumps(data, indent=2, default=str)}")
    except Exception as e:
        print(f"   ERROR: {e}")
    
    # Test 4: Try to seed data
    print("\n4. Seed Hierarchy Data:")
    try:
        response = requests.post(f"{BASE_URL}/hierarchy/seed", timeout=10)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {json.dumps(response.json(), indent=2, default=str)}")
    except Exception as e:
        print(f"   ERROR: {e}")
    
    # Test 5: Get categories again after seeding
    print("\n5. Get Categories After Seeding:")
    try:
        response = requests.get(f"{BASE_URL}/hierarchy/categories", timeout=5)
        print(f"   Status: {response.status_code}")
        data = response.json()
        if isinstance(data, list):
            print(f"   Found {len(data)} categories")
            if data:
                print(f"   First item: {json.dumps(data[0], indent=2, default=str)}")
        else:
            print(f"   Response: {json.dumps(data, indent=2, default=str)}")
    except Exception as e:
        print(f"   ERROR: {e}")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    test_apis()
