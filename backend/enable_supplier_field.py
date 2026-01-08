"""
Script to enable supplier field for categories
Run this to enable supplier field filtering in Item Master
"""
import asyncio
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.models.specifications import CategorySpecifications, create_default_variant_field_config, FieldSource
from app.models.category_hierarchy import ItemCategory

async def enable_supplier_field():
    """Enable supplier field for all categories"""
    
    # Connect to MongoDB
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.ccpl_erp
    
    # Initialize Beanie
    await init_beanie(
        database=db,
        document_models=[CategorySpecifications, ItemCategory]
    )
    
    print("Connected to database\n")
    
    # Get all categories
    categories = await ItemCategory.find(ItemCategory.deleted_at == None).to_list()
    print(f"Found {len(categories)} categories\n")
    
    enabled_count = 0
    created_count = 0
    
    for category in categories:
        print(f"Processing: {category.category_code} - {category.category_name}")
        
        # Check if specifications exist
        spec = await CategorySpecifications.find_one(
            CategorySpecifications.category_code == category.category_code
        )
        
        if not spec:
            # Create new specification with supplier enabled
            from app.models.specifications import create_default_specifications_config
            default_config = create_default_specifications_config()
            
            # Enable supplier field
            default_config.supplier.enabled = True
            default_config.supplier.required = False
            
            spec = CategorySpecifications(
                category_code=category.category_code,
                category_name=category.category_name,
                category_level=1,
                specifications=default_config,
                custom_fields=[],
                is_active=True
            )
            await spec.insert()
            print(f"  ✓ Created new specification with supplier enabled")
            created_count += 1
        else:
            # Update existing specification
            if not spec.specifications:
                from app.models.specifications import create_default_specifications_config
                spec.specifications = create_default_specifications_config()
            
            if not spec.specifications.supplier:
                spec.specifications.supplier = create_default_variant_field_config(
                    field_key="supplier_code",
                    field_name="Supplier",
                    source=FieldSource.SUPPLIER_MASTER,
                    enabled=True,
                    required=False
                )
                await spec.save()
                print(f"  ✓ Added supplier field (enabled)")
                enabled_count += 1
            elif not spec.specifications.supplier.enabled:
                spec.specifications.supplier.enabled = True
                spec.specifications.supplier.required = False
                await spec.save()
                print(f"  ✓ Enabled supplier field")
                enabled_count += 1
            else:
                print(f"  - Supplier field already enabled")
    
    print(f"\n✅ Complete!")
    print(f"   Created: {created_count} new specifications")
    print(f"   Enabled: {enabled_count} supplier fields")
    print(f"\nSupplier field is now enabled for all categories.")
    print(f"Users can now filter suppliers by category when adding items.")

if __name__ == "__main__":
    asyncio.run(enable_supplier_field())
