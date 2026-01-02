# SKU (Stock Keeping Unit) Structure Implementation Guide

## Overview
The SKU system provides a unique identifier for every item in the inventory. It's structured as a 5-component code that captures the complete hierarchy and specifications of an item.

## SKU Format
```
FM - ABCD - A0000 - 0000 - 00
```

### Component Breakdown

#### 1. **Item Type Code (2 letters)** - `FM`
- **What**: Two-letter code representing the item type
- **Where Generated**: When creating an Item Type (e.g., Finished Goods, Raw Material, Accessories)
- **Examples**: 
  - FM = Finished Goods
  - RM = Raw Material
  - AC = Accessories
  - CM = Components
  - SG = Semi-Goods

**Backend Processing**:
- Generated from `ItemType.type_name` by taking first letters of each word
- Stored in `ItemType.sku_type_code` field
- Used in all SKUs for items of that type

---

#### 2. **Category Code (2-4 letters)** - `ABCD`
- **What**: Code based on the item's deepest category level (Level 5)
- **Where Generated**: When creating/editing a category hierarchy
- **Examples**:
  - APRL = Apparel
  - TSHT = T-Shirt
  - RNCK = Round Neck
  - FRML = Formal
  - MENS = Men's

**Backend Processing**:
- Generated from the last (deepest) level of the category hierarchy
- Takes first letters of each word in the level name, max 4 characters
- Stored in `ItemCategory.sku_category_code` field (at L1)
- Same code used for all items under that category branch

---

#### 3. **Item Sequence (1 letter + 4 digits)** - `A0000`
- **What**: Auto-incrementing unique identifier within each item type
- **Where Generated**: When creating an Item Master
- **Examples**:
  - A0001 = First item of type FM
  - A0002 = Second item of type FM
  - B0001 = First item after 10,000 items (letter cycles A→Z)
  - A0500 = 500th item of same type

**Backend Processing**:
- Counter: `ItemType.next_item_sequence` increments with each new item
- Letter: Cycles A-Z based on thousands (A=0-9999, B=10000-19999, etc.)
- Digits: Range 0001-9999, resets at 10000
- Stored in `ItemMaster.sku_sequence` field
- Ensures no two items of same type have duplicate sequence

---

#### 4. **Primary Variant (4 characters)** - `0000`
- **What**: Primary specification/variant of the item, typically color
- **Where Generated**: When creating an Item Master with specifications
- **Examples**:
  - R000 = Red (first letter + padding)
  - BL00 = Blue
  - NV00 = Navy
  - BLK0 = Black
  - GRN0 = Green

**Backend Processing**:
- Generated from color name (or first variant type if color not applicable)
- Abbreviates name to 4 characters
- Stored in `ItemMaster.sku_variant1` field
- Represents the primary visual characteristic of the item

---

#### 5. **Secondary Variant (2 characters)** - `00`
- **What**: Secondary specification/variant, typically size or UOM
- **Where Generated**: When creating an Item Master with secondary specifications
- **Examples**:
  - SM = Small
  - MD = Medium
  - LG = Large
  - XL = Extra Large
  - KG = Kilogram

**Backend Processing**:
- Generated from size name or UOM (Unit of Measure)
- Abbreviates to 2 characters max
- Stored in `ItemMaster.sku_variant2` field
- Represents secondary characteristics (size, weight unit, etc.)

---

## Database Implementation

### Modified Models

#### ItemType Model
```python
# New fields added:
sku_type_code: str              # e.g., "FM"
next_item_sequence: int = 0     # Counter for sequences
```

#### ItemCategory Model
```python
# New field added:
sku_category_code: str          # e.g., "ABCD" (from deepest level)
```

#### ItemMaster Model
```python
# New fields added:
sku: Optional[str]              # Complete SKU: FM-ABCD-A0000-0000-00
sku_type_code: Optional[str]    # Part 1
sku_category_code: Optional[str] # Part 2
sku_sequence: Optional[str]     # Part 3
sku_variant1: Optional[str]     # Part 4
sku_variant2: Optional[str]     # Part 5
```

---

## Backend Service Implementation

### SKUService (sku_service.py)

#### Key Methods:

**1. `generate_item_type_code(type_name: str) -> str`**
- Converts item type name to 2-letter code
- Example: "Finished Goods" → "FG"

**2. `generate_category_code(level_name: str) -> str`**
- Converts category level name to 2-4 letter code
- Example: "Round Neck" → "RNCK"

**3. `generate_item_sequence_code(item_count: int) -> str`**
- Creates 1 letter + 4 digit sequence
- Example: Item 500 → "A0500"

**4. `generate_variant_code(variant_name: str, variant_type: str, max_length: int) -> str`**
- Creates variant abbreviation
- Color variant: 4 chars (max)
- Size variant: 2 chars (max)

**5. `construct_sku(...) -> str`**
- Assembles complete SKU from components
- Ensures proper formatting and spacing

**6. `parse_sku(sku: str) -> dict`**
- Extracts components from SKU string
- Used for validation and display

---

## Frontend Implementation

### SKU Display Component (SKUDisplay.jsx)

Three display modes:

#### 1. **Compact Mode** (Default)
```
Shows: SKU: FM-ABCD-A0000-0000-00 (inline badge)
Used in: Item Master table, item lists
```

#### 2. **Detailed Mode** (Full Breakdown)
```
Shows:
- Full SKU in large font
- 5-component grid with explanations
- Each component labeled with purpose
Used in: Item detail panels, modals
```

#### 3. **Hover Tooltip**
```
Shows: Tooltip on hover showing all components
Used in: Table cells with detailed info on hover
```

---

## Workflow Examples

### Example 1: Creating an Item Type
**Input**: User creates "Finished Goods" item type

**Processing**:
1. `generate_item_type_code("Finished Goods")` → "FG"
2. Store `sku_type_code = "FG"` in ItemType model
3. Initialize `next_item_sequence = 0`

**Result**: All items of type "Finished Goods" will start with "FG-"

---

### Example 2: Creating a Category
**Input**: User creates hierarchy:
- L1: Apparel (code: APRL)
- L2: Men's (code: MENS)
- L3: Topwear (code: TOPW)
- L4: T-Shirts (code: TSHT)
- L5: Round Neck (code: RNCK)

**Processing**:
1. `generate_category_code("Round Neck")` → "RNCK"
2. Store `sku_category_code = "RNCK"` in ItemCategory model
3. This applies to all items in this category branch

**Result**: All items in this category will have "RNCK" as Part 2

---

### Example 3: Creating an Item
**Input**: 
- Item Type: "Finished Goods" (sku_type_code: "FG", next_sequence: 5)
- Category: Under RNCK
- Color: Red
- Size: Medium

**Processing**:
1. Item Type Code: "FG" (from ItemType)
2. Category Code: "RNCK" (from Category)
3. Sequence: `generate_item_sequence_code(5)` → "A0005"
4. Variant 1 (Color): `generate_variant_code("Red", "color", 4)` → "R000"
5. Variant 2 (Size): `generate_variant_code("Medium", "size", 2)` → "MD"
6. Final SKU: `construct_sku("FG", "RNCK", "A0005", "R000", "MD")` → "FG-RNCK-A0005-R000-MD"
7. Increment `ItemType.next_item_sequence` from 5 to 6

**Result**:
```
Complete SKU: FG-RNCK-A0005-R000-MD

Breaking down:
- FG: Finished Goods (Type)
- RNCK: Round Neck (Category)
- A0005: 5th item of FG type
- R000: Red color variant
- MD: Medium size variant
```

---

## Display Locations

### Item Category Master Page
- **Show**: SKU Category Code in tree view
- **Format**: `SKU: RNCK` (purple badge next to category code)
- **Location**: Right side of category name in hierarchy tree

### Item Master Page
- **Show**: Complete SKU in item list table
- **Format**: `SKU: FG-RNCK-A0005-R000-MD` (indigo badge under item name)
- **Location**: Item column, below color name

### Item Detail View
- **Show**: Detailed SKU breakdown with component explanations
- **Format**: 5-component grid with descriptions
- **Location**: Item details panel/modal

---

## Future Enhancements

1. **SKU Generation Rules**: Allow admin to customize abbreviation rules per company
2. **SKU History**: Track SKU changes and maintain historical records
3. **SKU Verification**: Validate SKU format before saving items
4. **SKU Import**: Import items with existing SKUs and validate uniqueness
5. **SKU Reports**: Generate reports showing SKU usage and patterns
6. **Barcode Generation**: Auto-generate barcodes from SKU codes
7. **SKU Search**: Quick search items by SKU components (type, category, etc.)

---

## API Endpoints (To Be Implemented)

### SKU Generation
```
POST /api/sku/generate
{
  item_type_code: string,
  category_code: string,
  item_count: number,
  color_name?: string,
  size_name?: string
}
Returns: { sku: string, components: {...} }
```

### SKU Validation
```
POST /api/sku/validate
{
  sku: string
}
Returns: { valid: boolean, components: {...}, message?: string }
```

### SKU Search
```
GET /api/sku/search?component=RNCK&type=category
Returns: [items with matching SKU component]
```

---

## Notes
- All SKU components are case-insensitive (normalized to uppercase)
- SKU must be unique within the inventory system
- Once assigned, SKU should not change (maintain in history if changed)
- SKU serves as the primary identifier alongside item_code
- SKU can be printed on labels, barcodes, and reports
