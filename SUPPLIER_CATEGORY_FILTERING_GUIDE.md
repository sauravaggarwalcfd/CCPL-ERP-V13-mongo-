# Supplier Category Filtering Guide

## Overview

The ERP system supports filtering suppliers by item categories using **Supplier Groups**. When you add an item in Item Master, the supplier dropdown will only show suppliers whose groups are linked to that category in the Category Master.

## How It Works

### 1. Supplier Groups
- Suppliers are organized into groups (e.g., "TEXTILE_SUPPLIERS", "PACKAGING_VENDORS")
- Each supplier can belong to multiple groups

### 2. Category Configuration
- In Category Master, you configure which supplier groups are available for each category
- For example: "Apparel" category → Link "TEXTILE_SUPPLIERS" group
- This creates the connection between categories and suppliers

### 3. Backend Filtering Logic
- When selecting a supplier for an item, the system:
  - Checks which supplier groups are configured for that category
  - Only shows suppliers that belong to those groups
  - If no groups are configured, all suppliers are shown

### 4. Frontend Integration
- The supplier field uses the dynamic specification form
- Values are fetched via: `/specifications/{category_code}/field-values/supplier_code`
- The API automatically filters suppliers based on configured groups

## Setup Instructions

### Step 1: Enable Supplier Field for Category

1. Navigate to **Category Master**
2. Select/edit the category (e.g., "Apparel")
3. In the **Specifications** section:
   - Toggle the **Supplier** field to ENABLED
   - Select which **Supplier Groups** should be available (e.g., "TEXTILE_SUPPLIERS")
   - Save the category

### Step 2: Organize Suppliers into Groups

1. Navigate to **Supplier Master**
2. Create supplier groups if needed:
   - Click "Manage Groups"
   - Add groups like "TEXTILE_SUPPLIERS", "PACKAGING_VENDORS", etc.
3. Assign suppliers to groups:
   - Edit each supplier
   - In the "Supplier Groups" section, select appropriate groups
   - A supplier can belong to multiple groups
   - Save

### Step 3: Test the Filtering

1. Navigate to **Item Master**
2. Click "Add Item"
3. Select a category (e.g., "Apparel")
4. In the specifications section:
   - The **Supplier** dropdown will only show suppliers from groups linked to "Apparel"

## Example Scenario

### Setup:
- **Supplier Groups**:
  - TEXTILE_SUPPLIERS
  - PACKAGING_VENDORS
  - BUTTON_SUPPLIERS

- **Suppliers**:
  - Delhi Textiles → TEXTILE_SUPPLIERS
  - Mumbai Buttons → BUTTON_SUPPLIERS  
  - Packaging Co → PACKAGING_VENDORS

- **Categories**:
  - Apparel → Linked to TEXTILE_SUPPLIERS, BUTTON_SUPPLIERS
  - Packaging → Linked to PACKAGING_VENDORS

### Results when adding items:
- Item in "Apparel" category → Shows Delhi Textiles, Mumbai Buttons
- Item in "Packaging" category → Shows Packaging Co only

## Troubleshooting

### Issue: All suppliers showing in dropdown
**Solution**: Check that:
1. Supplier field is enabled in Category Master for that category
2. Supplier groups are selected/linked in the category configuration
3. Suppliers are assigned to those groups in Supplier Master

### Issue: No suppliers showing in dropdown
**Solution**: Check that:
1. The category has supplier groups configured
2. At least one supplier belongs to those groups
3. The suppliers are marked as active (`is_active = true`)

### Issue: Wrong suppliers showing
**Solution**: 
1. Verify which supplier groups are linked in Category Master
2. Check which groups each supplier belongs to in Supplier Master
3. Update the group assignments as needed

## Technical Details

### Database Schema
```python
# Supplier Master Model
class SupplierMaster:
    supplier_code: str
    supplier_name: str
    supplier_groups: List[str]  # List of group codes
    # ... other fields

# Category Specifications
class CategorySpecifications:
    specifications: {
        supplier: {
            enabled: bool
            required: bool
            groups: List[str]  # Supplier groups for this category
        }
    }
```

### API Endpoint
```
GET /specifications/{category_code}/field-values/supplier_code
```

### Filtering Logic
```python
if field_config.groups:
    # Filter suppliers by configured groups
    query["$or"] = [
        {"supplier_groups": {"$in": field_config.groups}},
        {"supplier_group_code": {"$in": field_config.groups}}  # Legacy support
    ]
else:
    # No groups configured - show all suppliers
```

## Benefits

1. **Centralized Control**: Manage supplier-category relationships in one place (Category Master)
2. **Flexibility**: One supplier can serve multiple categories through group membership
3. **Easy Maintenance**: Change category-supplier relationships without editing individual suppliers
4. **Scalability**: Add new supplier groups and link them to categories as needed
5. **Reduced Errors**: Users can't select inappropriate suppliers for items

## Notes

- Supplier groups are the primary method for filtering
- If no supplier groups are configured for a category, ALL suppliers will be available
- A supplier can belong to multiple groups
- This approach is cleaner than direct supplier-to-category linking
