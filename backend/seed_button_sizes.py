"""
Seed Button Sizes to Database
Adds Ligne (L), MM, and INCH measurements for button sizes
"""

import asyncio
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.models.size_master import SizeMaster
from app.models.variant_groups import VariantGroup, VariantType
from datetime import datetime

MONGODB_URL = "mongodb://localhost:27017"
DATABASE_NAME = "ccpl_inventory_erp"

button_sizes_data = [
    {"ligne": "12L", "mm": "7.5mm", "inch": "5/16in", "numeric": 7.5},
    {"ligne": "13L", "mm": "8mm", "inch": "5/16in", "numeric": 8.0},
    {"ligne": "14L", "mm": "9mm", "inch": "11/32in", "numeric": 9.0},
    {"ligne": "15L", "mm": "9.5mm", "inch": "3/8in", "numeric": 9.5},
    {"ligne": "16L", "mm": "10mm", "inch": "13/32in", "numeric": 10.0},
    {"ligne": "17L", "mm": "10.5mm", "inch": "7/16in", "numeric": 10.5},
    {"ligne": "18L", "mm": "11.5mm", "inch": "15/32in", "numeric": 11.5},
    {"ligne": "20L", "mm": "12.5mm", "inch": "1/2in", "numeric": 12.5},
    {"ligne": "22L", "mm": "14mm", "inch": "9/16in", "numeric": 14.0},
    {"ligne": "24L", "mm": "15mm", "inch": "5/8in", "numeric": 15.0},
    {"ligne": "26L", "mm": "16mm", "inch": "21/32in", "numeric": 16.0},
    {"ligne": "28L", "mm": "18mm", "inch": "23/32in", "numeric": 18.0},
    {"ligne": "30L", "mm": "19mm", "inch": "3/4in", "numeric": 19.0},
    {"ligne": "32L", "mm": "20mm", "inch": "13/16in", "numeric": 20.0},
    {"ligne": "34L", "mm": "21.5mm", "inch": "27/32in", "numeric": 21.5},
    {"ligne": "36L", "mm": "23mm", "inch": "7/8in", "numeric": 23.0},
    {"ligne": "38L", "mm": "24mm", "inch": "15/16in", "numeric": 24.0},
    {"ligne": "40L", "mm": "25mm", "inch": "1in", "numeric": 25.0},
]


async def seed_button_sizes():
    """Seed button sizes to database"""
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGODB_URL)
    database = client[DATABASE_NAME]
    
    # Initialize Beanie
    await init_beanie(
        database=database,
        document_models=[SizeMaster, VariantGroup]
    )
    
    print("🔗 Connected to MongoDB")
    
    # Check if "Button Sizes" group exists, if not create it
    button_group = await VariantGroup.find_one(
        VariantGroup.group_code == "BTN",
        VariantGroup.variant_type == VariantType.SIZE
    )
    
    if not button_group:
        print("📦 Creating 'Button Sizes' group...")
        button_group = VariantGroup(
            group_code="BTN",
            group_name="Button Sizes",
            variant_type=VariantType.SIZE,
            description="Button sizes in Ligne (L), Millimeters (MM), and Inches",
            is_active=True,
            display_order=1,
            created_by="system",
            created_date=datetime.utcnow()
        )
        await button_group.save()
        print("✅ Button Sizes group created")
    else:
        print("✅ Button Sizes group already exists")
    
    # Add button sizes
    added_count = 0
    updated_count = 0
    
    for idx, size_data in enumerate(button_sizes_data, start=1):
        size_code = f"BTN-{size_data['ligne']}"
        
        # Check if size already exists
        existing_size = await SizeMaster.find_one(SizeMaster.size_code == size_code)
        
        if existing_size:
            # Update existing
            existing_size.size_name = size_data['ligne']
            existing_size.numeric_value = size_data['numeric']
            existing_size.unit = "mm"
            existing_size.description = f"{size_data['ligne']} | {size_data['mm']} | {size_data['inch']}"
            existing_size.display_order = idx
            existing_size.last_modified_by = "system"
            existing_size.last_modified_date = datetime.utcnow()
            await existing_size.save()
            updated_count += 1
            print(f"📝 Updated: {size_data['ligne']} ({size_data['mm']} / {size_data['inch']})")
        else:
            # Create new
            new_size = SizeMaster(
                size_code=size_code,
                size_name=size_data['ligne'],
                size_group="BTN",
                group_name="Button Sizes",
                numeric_value=size_data['numeric'],
                unit="mm",
                description=f"{size_data['ligne']} | {size_data['mm']} | {size_data['inch']}",
                is_active=True,
                display_order=idx,
                created_by="system",
                created_date=datetime.utcnow()
            )
            await new_size.save()
            added_count += 1
            print(f"✅ Added: {size_data['ligne']} ({size_data['mm']} / {size_data['inch']})")
    
    print(f"\n🎉 Button sizes seeding completed!")
    print(f"   ✅ Added: {added_count}")
    print(f"   📝 Updated: {updated_count}")
    print(f"   📊 Total: {len(button_sizes_data)}")
    
    # Close connection
    client.close()


if __name__ == "__main__":
    print("🚀 Starting button sizes seeding...")
    print("=" * 50)
    asyncio.run(seed_button_sizes())
    print("=" * 50)
    print("✨ Done!")
