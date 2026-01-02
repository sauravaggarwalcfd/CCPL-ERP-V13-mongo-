"""
Migration Script: Update all items with full hierarchical SKU format
SKU Format: TT-CCCC-A0000-0000-00
  - TT: Item Type code (2 chars)
  - CCCC: Category code (4 chars from deepest category level)
  - A0000: Sequence (letter + 4 digits)
  - 0000: Variant 1 (color)
  - 00: Variant 2 (size)
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# MongoDB connection - use Atlas from .env
MONGO_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DATABASE_NAME", "inventory_erp")


def generate_sku_code_from_name(name: str, length: int = 4) -> str:
    """Generate SKU code from a name by taking consonants first, then vowels"""
    if not name:
        return "0" * length
    
    name = name.upper()
    consonants = ''.join(c for c in name if c.isalpha() and c not in 'AEIOU')
    vowels = ''.join(c for c in name if c.isalpha() and c in 'AEIOU')
    
    code = consonants + vowels
    code = code[:length] if len(code) >= length else code.ljust(length, '0')
    return code


async def migrate_item_skus():
    """Update all items with full hierarchical SKU format"""
    
    print("=" * 60)
    print("SKU Migration Script - Full Hierarchical Format")
    print("=" * 60)
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Load lookup data
    print("\nLoading lookup data...")
    
    # Load item types
    item_types = {}
    async for t in db.item_types.find({}):
        code = t.get('type_code')
        if code:
            item_types[code] = {
                'sku_type_code': t.get('sku_type_code') or generate_sku_code_from_name(t.get('type_name', ''), 2),
                'name': t.get('type_name')
            }
    print(f"  Loaded {len(item_types)} item types")
    
    # Load categories (Level 1)
    categories = {}
    async for c in db.item_categories.find({}):
        code = c.get('category_code')
        if code:
            categories[code] = {
                'sku_category_code': c.get('sku_category_code') or generate_sku_code_from_name(c.get('category_name', ''), 4),
                'name': c.get('category_name'),
                'item_type': c.get('item_type', 'FG')
            }
    print(f"  Loaded {len(categories)} categories (L1)")
    
    # Load sub-categories (Level 2)
    sub_categories = {}
    async for c in db.item_sub_categories.find({}):
        code = c.get('sub_category_code')
        if code:
            sub_categories[code] = {
                'sku_category_code': c.get('sku_category_code') or generate_sku_code_from_name(c.get('sub_category_name', ''), 4),
                'name': c.get('sub_category_name'),
                'parent': c.get('category_code') or c.get('category_id')
            }
    print(f"  Loaded {len(sub_categories)} sub-categories (L2)")
    
    # Load divisions (Level 3)
    divisions = {}
    async for c in db.item_divisions.find({}):
        code = c.get('division_code')
        if code:
            divisions[code] = {
                'sku_category_code': c.get('sku_category_code') or generate_sku_code_from_name(c.get('division_name', ''), 4),
                'name': c.get('division_name')
            }
    print(f"  Loaded {len(divisions)} divisions (L3)")
    
    # Load classes (Level 4)
    classes = {}
    async for c in db.item_classes.find({}):
        code = c.get('class_code')
        if code:
            classes[code] = {
                'sku_category_code': c.get('sku_category_code') or generate_sku_code_from_name(c.get('class_name', ''), 4),
                'name': c.get('class_name')
            }
    print(f"  Loaded {len(classes)} classes (L4)")
    
    # Load sub-classes (Level 5)
    sub_classes = {}
    async for c in db.item_sub_classes.find({}):
        code = c.get('sub_class_code')
        if code:
            sub_classes[code] = {
                'sku_category_code': c.get('sku_category_code') or generate_sku_code_from_name(c.get('sub_class_name', ''), 4),
                'name': c.get('sub_class_name')
            }
    print(f"  Loaded {len(sub_classes)} sub-classes (L5)")
    
    # Get all items
    items_collection = db.item_master
    items = await items_collection.find({}).to_list(length=None)
    
    print(f"\nFound {len(items)} items to process")
    
    updated_count = 0
    skipped_count = 0
    
    for item in items:
        item_code = item.get('item_code', '')
        
        # Get item type from item_code prefix (RM, FG, etc.)
        type_prefix = item_code[:2].upper() if len(item_code) >= 2 else 'FG'
        
        # Get type SKU code from lookup or use prefix
        if type_prefix in item_types:
            type_sku = item_types[type_prefix]['sku_type_code']
        else:
            type_sku = type_prefix
        
        # Get category info
        category_code = item.get('category_code') or item.get('category_id')
        sub_class_code = item.get('sub_class_code')
        class_code = item.get('class_code')
        division_code = item.get('division_code')
        sub_category_code = item.get('sub_category_code') or item.get('sub_category_id')
        
        # Get category SKU code from deepest level
        category_sku = None
        category_source = None
        
        if sub_class_code and sub_class_code in sub_classes:
            category_sku = sub_classes[sub_class_code]['sku_category_code']
            category_source = f"L5:{sub_class_code}"
        elif class_code and class_code in classes:
            category_sku = classes[class_code]['sku_category_code']
            category_source = f"L4:{class_code}"
        elif division_code and division_code in divisions:
            category_sku = divisions[division_code]['sku_category_code']
            category_source = f"L3:{division_code}"
        elif sub_category_code and sub_category_code in sub_categories:
            category_sku = sub_categories[sub_category_code]['sku_category_code']
            category_source = f"L2:{sub_category_code}"
        elif category_code and category_code in categories:
            category_sku = categories[category_code]['sku_category_code']
            category_source = f"L1:{category_code}"
        
        # Fallback: generate from name
        if not category_sku:
            sub_cat_name = item.get('sub_category_name', '')
            cat_name = item.get('category_name', '')
            name_to_use = sub_cat_name or cat_name or 'GNRL'
            category_sku = generate_sku_code_from_name(name_to_use, 4)
            category_source = f"Gen:{name_to_use[:8]}"
        
        # Extract sequence from item_code
        try:
            numeric_part = ''.join(filter(str.isdigit, item_code))
            sequence = int(numeric_part) if numeric_part else 1
        except:
            sequence = 1
        
        # Generate sequence code (A0001 format)
        seq_letter = chr(65 + (sequence - 1) // 10000)
        seq_num = ((sequence - 1) % 10000) + 1
        sequence_code = f"{seq_letter}{str(seq_num).zfill(4)}"
        
        # Get variant codes
        color_name = item.get('color_name', '')
        size_name = item.get('size_name', '')
        
        variant1 = generate_sku_code_from_name(color_name, 4) if color_name else "0000"
        variant2 = generate_sku_code_from_name(size_name, 2) if size_name else "00"
        
        # Build full SKU
        full_sku = f"{type_sku}-{category_sku}-{sequence_code}-{variant1}-{variant2}"
        
        # Update the item
        result = await items_collection.update_one(
            {'_id': item['_id']},
            {
                '$set': {
                    'sku': full_sku,
                    'sku_type_code': type_sku,
                    'sku_category_code': category_sku,
                    'sku_sequence': sequence_code,
                    'sku_variant1': variant1,
                    'sku_variant2': variant2,
                    'updated_at': datetime.now(timezone.utc)
                }
            }
        )
        
        if result.modified_count > 0:
            print(f"  UPDATE: {item_code} -> {full_sku}")
            updated_count += 1
        else:
            current_sku = item.get('sku')
            if current_sku == full_sku:
                print(f"  SAME: {item_code} = {full_sku}")
                skipped_count += 1
            else:
                print(f"  FAILED: {item_code}")
    
    print("\n" + "=" * 60)
    print(f"Migration Complete!")
    print(f"  Updated: {updated_count} items")
    print(f"  Skipped: {skipped_count} items")
    print(f"  Total:   {len(items)} items")
    print("=" * 60)
    
    client.close()


if __name__ == "__main__":
    asyncio.run(migrate_item_skus())
