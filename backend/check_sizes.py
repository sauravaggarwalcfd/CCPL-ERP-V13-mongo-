"""Check if button sizes are properly stored"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.variant_groups import VariantGroup, VariantType
from app.models.size_master import SizeMaster

async def check_button_sizes():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['ccpl_inventory_erp']
    await init_beanie(database=db, document_models=[VariantGroup, SizeMaster])
    
    print("Checking Size Groups...")
    groups = await VariantGroup.find(VariantGroup.variant_type == VariantType.SIZE).to_list()
    print(f'Total Size Groups: {len(groups)}')
    for g in groups:
        print(f'  - {g.group_code}: {g.group_name} (Active: {g.is_active})')
    
    print("\nChecking Button Sizes...")
    sizes = await SizeMaster.find(SizeMaster.size_group == 'BTN').to_list()
    print(f'Total Button Sizes: {len(sizes)}')
    for s in sizes[:5]:
        print(f'  - {s.size_code}: {s.size_name} - {s.description}')
    
    client.close()

asyncio.run(check_button_sizes())
