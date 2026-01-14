#!/bin/bash

# Test the purchase request API with curl

API_URL="http://localhost:8000/api/purchase/purchase-requests"

# Minimal valid payload
PAYLOAD='{
  "pr_date": "2026-01-12",
  "department": "test",
  "priority": "HIGH",
  "required_by_date": "2026-01-14",
  "purpose": "Test",
  "justification": "Test",
  "notes": "Test",
  "items": [
    {
      "item_code": null,
      "item_name": "Test Item",
      "item_description": "Test",
      "item_category": "Test",
      "category_path": "Test",
      "category_code": null,
      "sub_category_code": null,
      "division_code": null,
      "class_code": null,
      "sub_class_code": null,
      "quantity": 10,
      "unit": "PCS",
      "estimated_unit_rate": 50,
      "required_date": null,
      "colour_code": null,
      "size_code": null,
      "uom_code": null,
      "suggested_supplier_code": null,
      "suggested_supplier_name": null,
      "suggested_brand_code": null,
      "suggested_brand_name": null,
      "specifications": {},
      "notes": "",
      "is_new_item": false
    }
  ]
}'

echo "Testing Purchase Request API"
echo "URL: $API_URL"
echo "Payload:"
echo "$PAYLOAD" | jq '.'

echo ""
echo "Sending request..."
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  -v 2>&1 | tee test_response.txt

echo ""
echo "Response saved to test_response.txt"
