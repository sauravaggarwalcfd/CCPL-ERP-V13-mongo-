"""
Test script for Purchase Request API
Run this after starting the backend server
"""
import requests
import json

BASE_URL = "http://localhost:8000/api"

# First login to get a token
def login():
    """Login and get access token"""
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "admin@example.com",  # Change if needed
            "password": "admin123"  # Change if needed
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        else:
            print(f"Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Login error: {e}")
        return None

def test_pr_creation(token):
    """Test creating a purchase request"""

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Minimal valid payload
    payload = {
        "pr_date": "2026-01-12",
        "department": "Test Department",
        "priority": "NORMAL",
        "required_by_date": "2026-01-20",
        "purpose": "Testing PR creation",
        "justification": None,
        "notes": None,
        "items": [
            {
                "item_code": None,
                "item_name": "Test Item",
                "item_description": "",
                "item_category": None,
                "category_path": "",
                "category_code": None,
                "sub_category_code": None,
                "division_code": None,
                "class_code": None,
                "sub_class_code": None,
                "quantity": 10,
                "unit": "PCS",
                "estimated_unit_rate": 100.0,
                "required_date": None,
                "colour_code": None,
                "size_code": None,
                "uom_code": None,
                "suggested_supplier_code": None,
                "suggested_supplier_name": None,
                "suggested_brand_code": None,
                "suggested_brand_name": None,
                "specifications": {},
                "notes": "",
                "is_new_item": True
            }
        ]
    }

    print("\n=== Testing PR Validation ===")
    print(f"Payload: {json.dumps(payload, indent=2)}")

    # Test validate endpoint first
    try:
        response = requests.post(
            f"{BASE_URL}/purchase/purchase-requests/validate",
            headers=headers,
            json=payload
        )
        print(f"\nValidation Response: {response.status_code}")
        print(f"Response body: {response.text}")
    except Exception as e:
        print(f"Validation error: {e}")

    print("\n=== Testing PR Creation ===")

    # Test actual creation
    try:
        response = requests.post(
            f"{BASE_URL}/purchase/purchase-requests",
            headers=headers,
            json=payload
        )
        print(f"\nCreation Response: {response.status_code}")
        print(f"Response body: {response.text}")

        if response.status_code == 201:
            print("\n SUCCESS: PR created successfully!")
        else:
            print(f"\n FAILED: {response.status_code}")

    except Exception as e:
        print(f"Creation error: {e}")

if __name__ == "__main__":
    print("Testing Purchase Request API...")
    print("=" * 50)

    token = login()
    if token:
        print(f"Logged in successfully. Token: {token[:20]}...")
        test_pr_creation(token)
    else:
        print("Could not login. Please check credentials.")
        # Try without auth for testing
        print("\nTrying without authentication...")
        test_pr_creation(None)
