"""
Item Master API Routes
CRUD operations for items using the new 5-level hierarchy
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
import logging
from datetime import datetime, timedelta
from ..models.item import ItemMaster, ItemMasterCreate, ItemMasterUpdate, InventoryType
from ..models.category_hierarchy import ItemSubClass
from ..models.inventory_management import InventoryStock, StockLevel, StockMovement, MovementType
from ..models.item_type import ItemType
from ..models.specifications import ItemSpecifications
from ..services.sku_service import SKUService, generate_complete_sku
from ..core.dependencies import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


# ==================== ITEM MASTER ROUTES ====================

async def generate_uid(item_type_code: str, category_code: str = None) -> str:
    """
    Generate a unique UID for a new item
    Format: [ItemTypeCode 2 chars][CategoryCode 2 chars][4 digit running counter]
    Example: FGRN0001, RMBT0002, TRPK0001

    Args:
        item_type_code: 2-character item type code (e.g., FG, RM, TR)
        category_code: Category code to derive 2 letters from (e.g., RNCK -> RN)
    """
    # Normalize item type code to uppercase 2 chars
    type_code = (item_type_code or "XX").upper()[:2].ljust(2, "X")

    # Get first 2 letters from category code or use XX
    cat_code = "XX"
    if category_code:
        cat_code = category_code.upper()[:2].ljust(2, "X")

    # Build prefix for searching
    prefix = f"{type_code}{cat_code}"

    # Find the highest UID with this prefix
    # UIDs are now like: FGRN0001, FGRN0002, etc.
    latest_item = await ItemMaster.find(
        {"uid": {"$regex": f"^{prefix}\\d{{4}}$"}}
    ).sort("-uid").limit(1).to_list()

    if latest_item:
        try:
            # Extract sequence number from the last UID (last 4 digits)
            last_uid = latest_item[0].uid
            last_sequence = int(last_uid[-4:])
            next_sequence = last_sequence + 1
        except (ValueError, IndexError):
            next_sequence = 1
    else:
        next_sequence = 1

    # Ensure we don't exceed 9999
    if next_sequence > 9999:
        # If we exceed, we might need to use a different approach or log warning
        logger.warning(f"UID sequence for {prefix} exceeded 9999, resetting to timestamp-based")
        next_sequence = int(datetime.utcnow().strftime("%H%M"))

    return f"{prefix}{str(next_sequence).zfill(4)}"


async def generate_sku_with_specs(
    item_type_code: str,
    category_code: str,
    color_name: str = None,
    size_name: str = None
) -> dict:
    """
    Generate complete SKU with colour and size from specifications
    Format: FM-ABCD-A0000-COLR-SZ

    Returns dict with full SKU and components
    """
    # Get item type to get current sequence
    item_type = await ItemType.find_one(ItemType.type_code == item_type_code.upper())
    if not item_type:
        # Fallback to basic SKU
        current_sequence = 1
        type_code_for_sku = item_type_code.upper()[:2]
    else:
        current_sequence = (item_type.next_item_sequence or 0) + 1
        type_code_for_sku = item_type.sku_type_code or SKUService.generate_item_type_code(item_type.type_name)

    # Generate SKU components
    cat_code = (category_code or "XX").upper()[:4]
    sequence_code = SKUService.generate_item_sequence_code(current_sequence)

    # Generate variant codes from colour and size
    color_code = SKUService.generate_variant_code(color_name, "color", 4) if color_name else "0000"
    size_code = SKUService.generate_variant_code(size_name, "size", 2) if size_name else "00"

    # Construct full SKU
    full_sku = f"{type_code_for_sku}-{cat_code}-{sequence_code}-{color_code}-{size_code}"

    return {
        "sku": full_sku,
        "sku_type_code": type_code_for_sku,
        "sku_category_code": cat_code,
        "sku_sequence": sequence_code,
        "sku_variant1": color_code,
        "sku_variant2": size_code,
        "sequence_number": current_sequence
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_item(
    data: ItemMasterCreate,
    current_user = Depends(get_current_user)
):
    """Create a new Item Master entry"""

    # Check if non-deleted item already exists
    existing = await ItemMaster.find_one(
        ItemMaster.item_code == data.item_code,
        ItemMaster.deleted_at == None
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Item with code '{data.item_code}' already exists"
        )

    # Build hierarchy path if sub_class_code provided and inherit UOM settings
    hierarchy_path = None
    hierarchy_path_name = None
    # UOM fields - inherited from category (sub_class level)
    storage_uom = data.storage_uom if hasattr(data, 'storage_uom') and data.storage_uom else "PCS"
    purchase_uom = data.purchase_uom if hasattr(data, 'purchase_uom') and data.purchase_uom else "PCS"
    uom_conversion_factor = data.uom_conversion_factor if hasattr(data, 'uom_conversion_factor') and data.uom_conversion_factor else 1.0

    if data.sub_class_code:
        sub_class = await ItemSubClass.find_one(ItemSubClass.sub_class_code == data.sub_class_code.upper())
        if sub_class:
            hierarchy_path = sub_class.path
            hierarchy_path_name = sub_class.path_name
            # Inherit UOM from category (sub_class) - these override any user-provided values
            storage_uom = getattr(sub_class, 'storage_uom', 'PCS') or 'PCS'
            purchase_uom = getattr(sub_class, 'purchase_uom', 'PCS') or 'PCS'
            uom_conversion_factor = getattr(sub_class, 'uom_conversion_factor', 1.0) or 1.0

    # Determine the best category code to use for UID/SKU
    # Priority: sub_class_code > class_code > division_code > sub_category_code > category_code
    best_category_code = (
        data.sub_class_code or data.class_code or data.division_code or
        data.sub_category_code or data.category_code or "XX"
    )

    # Get item type code from sku_type_code or default to "XX"
    item_type_code = data.sku_type_code or "XX"

    # Generate unique UID (immutable identifier) with new format
    # Format: [ItemTypeCode 2 chars][CategoryCode 2 chars][4 digit counter]
    uid = data.uid if data.uid else await generate_uid(item_type_code, best_category_code)

    # Auto-generate SKU with colour and size from specifications
    sku_data = None
    if not data.sku:
        # Generate SKU automatically using colour and size
        sku_data = await generate_sku_with_specs(
            item_type_code=item_type_code,
            category_code=best_category_code,
            color_name=data.color_name,
            size_name=data.size_name
        )

        # Update ItemType sequence counter
        item_type = await ItemType.find_one(ItemType.type_code == item_type_code.upper())
        if item_type:
            item_type.next_item_sequence = sku_data["sequence_number"]
            await item_type.save()

    # Get opening stock value
    opening_stock = getattr(data, 'opening_stock', 0) or 0

    item = await ItemMaster(
        uid=uid,
        item_code=data.item_code,
        item_name=data.item_name,
        item_description=data.item_description,
        # SKU Fields - use generated if not provided
        sku=data.sku or (sku_data["sku"] if sku_data else None),
        sku_type_code=data.sku_type_code or (sku_data["sku_type_code"] if sku_data else None),
        sku_category_code=data.sku_category_code or (sku_data["sku_category_code"] if sku_data else None),
        sku_sequence=data.sku_sequence or (sku_data["sku_sequence"] if sku_data else None),
        sku_variant1=data.sku_variant1 or (sku_data["sku_variant1"] if sku_data else None),
        sku_variant2=data.sku_variant2 or (sku_data["sku_variant2"] if sku_data else None),
        category_code=data.category_code,
        category_name=data.category_name,
        sub_category_code=data.sub_category_code,
        sub_category_name=data.sub_category_name,
        division_code=data.division_code,
        division_name=data.division_name,
        class_code=data.class_code,
        class_name=data.class_name,
        sub_class_code=data.sub_class_code,
        sub_class_name=data.sub_class_name,
        hierarchy_path=hierarchy_path,
        hierarchy_path_name=hierarchy_path_name,
        color_id=data.color_id,
        color_name=data.color_name,
        size_id=data.size_id,
        size_name=data.size_name,
        brand_id=data.brand_id,
        brand_name=data.brand_name,
        # UOM - inherited from category (sub_class), read-only at item level
        uom=storage_uom,  # For backwards compatibility, uom = storage_uom
        storage_uom=storage_uom,
        purchase_uom=purchase_uom,
        uom_conversion_factor=uom_conversion_factor,
        inventory_type=data.inventory_type,
        cost_price=data.cost_price,
        selling_price=data.selling_price,
        mrp=data.mrp,
        hsn_code=data.hsn_code,
        gst_rate=data.gst_rate,
        warehouse_id=data.warehouse_id,
        warehouse_name=data.warehouse_name,
        barcode=data.barcode,
        opening_stock=opening_stock,
        current_stock=int(opening_stock),
        # File server fields (legacy)
        image_id=data.image_id,
        image_url=data.image_url,
        image_name=data.image_name,
        thumbnail_url=data.thumbnail_url,
        # BASE64 image fields (preferred)
        image_base64=data.image_base64,
        image_type=data.image_type,
        image_size=data.image_size,
        created_by=str(current_user.id) if current_user else None,
    ).insert()

    # Initialize inventory stock record
    if opening_stock > 0:
        try:
            # Create InventoryStock record
            inventory_stock = InventoryStock(
                item_code=data.item_code,
                item_name=data.item_name,
                uom=storage_uom,  # Always storage UOM
                opening_stock=opening_stock,
                current_stock=opening_stock,
                reserved_stock=0,
                available_stock=opening_stock,
                warehouse_id=data.warehouse_id,
                warehouse_name=data.warehouse_name,
            )
            await inventory_stock.save()

            # Create StockLevel record with defaults
            stock_level = StockLevel(
                item_code=data.item_code,
                item_name=data.item_name,
                minimum_stock=10,
                maximum_stock=1000,
                reorder_point=20,
                reorder_quantity=100,
            )
            await stock_level.save()

            # Create opening stock movement record
            today = datetime.utcnow().strftime("%Y%m%d")
            movement_id = f"MOV-{today}-{data.item_code[:8]}"

            movement = StockMovement(
                movement_id=movement_id,
                item_code=data.item_code,
                item_name=data.item_name,
                movement_type=MovementType.OPENING,
                quantity=opening_stock,
                # UOM tracking - for opening stock, source and target are the same (storage UOM)
                source_uom=storage_uom,
                target_uom=storage_uom,
                conversion_factor=1.0,
                source_quantity=opening_stock,
                balance_before=0,
                balance_after=opening_stock,
                reference_type="OPENING",
                reference_number=data.item_code,
                remarks=f"Opening stock for new item {data.item_code} in {storage_uom}",
                created_by=str(current_user.id) if current_user else None
            )
            await movement.save()

            logger.info(f"Initialized inventory for item {data.item_code} with opening stock {opening_stock}")
        except Exception as inv_error:
            logger.warning(f"Failed to initialize inventory for {data.item_code}: {inv_error}")

    logger.info(f"Created Item: {data.item_code} - {data.item_name} (UID: {uid})")

    return {
        "id": str(item.id),
        "uid": item.uid,
        "item_code": item.item_code,
        "item_name": item.item_name,
        "sku": item.sku,
        "opening_stock": opening_stock,
        "message": "Item created successfully"
    }


@router.get("/", response_model=List[dict])
async def list_items(
    category_code: Optional[str] = Query(None),
    sub_category_code: Optional[str] = Query(None),
    division_code: Optional[str] = Query(None),
    class_code: Optional[str] = Query(None),
    sub_class_code: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0),
    limit: int = Query(50),
    current_user = Depends(get_current_user)
):
    """List all items with optional filters"""
    
    query_conditions = []
    
    # Exclude deleted items from main list
    query_conditions.append(ItemMaster.deleted_at == None)
    
    if category_code:
        query_conditions.append(ItemMaster.category_code == category_code.upper())
    if sub_category_code:
        query_conditions.append(ItemMaster.sub_category_code == sub_category_code.upper())
    if division_code:
        query_conditions.append(ItemMaster.division_code == division_code.upper())
    if class_code:
        query_conditions.append(ItemMaster.class_code == class_code.upper())
    if sub_class_code:
        query_conditions.append(ItemMaster.sub_class_code == sub_class_code.upper())
    if is_active is not None:
        query_conditions.append(ItemMaster.is_active == is_active)
    
    if query_conditions:
        items = await ItemMaster.find(*query_conditions).skip(skip).limit(limit).to_list()
    else:
        items = await ItemMaster.find_all().skip(skip).limit(limit).to_list()
    
    # Apply search filter in memory if provided
    if search:
        search_lower = search.lower()
        items = [
            i for i in items
            if search_lower in i.item_name.lower() or 
               search_lower in i.item_code.lower() or
               (i.barcode and search_lower in i.barcode.lower())
        ]
    
    # Fetch inventory stock for all items
    item_codes = [i.item_code for i in items]
    if item_codes:
        inventory_stocks = await InventoryStock.find(
            {"item_code": {"$in": item_codes}}
        ).to_list()
        # Also fetch specifications for all items
        item_specs = await ItemSpecifications.find(
            {"item_code": {"$in": item_codes}}
        ).to_list()
    else:
        inventory_stocks = []
        item_specs = []

    # Create lookup dicts
    stock_lookup = {s.item_code: s for s in inventory_stocks}
    specs_lookup = {s.item_code: s for s in item_specs}

    return [
        {
            "id": str(i.id),
            "uid": getattr(i, 'uid', None),  # Unique Identifier (immutable)
            "item_code": i.item_code,
            "item_name": i.item_name,
            "item_description": i.item_description,
            # SKU Fields (can change)
            "sku": i.sku,
            "sku_type_code": i.sku_type_code,
            "sku_category_code": i.sku_category_code,
            "sku_sequence": i.sku_sequence,
            "sku_variant1": i.sku_variant1,
            "sku_variant2": i.sku_variant2,
            "category_code": i.category_code,
            "category_name": i.category_name,
            "sub_category_code": i.sub_category_code,
            "sub_category_name": i.sub_category_name,
            "division_code": i.division_code,
            "division_name": i.division_name,
            "class_code": i.class_code,
            "class_name": i.class_name,
            "sub_class_code": i.sub_class_code,
            "sub_class_name": i.sub_class_name,
            "hierarchy_path": i.hierarchy_path,
            "hierarchy_path_name": i.hierarchy_path_name,
            # Variant fields
            "color_id": i.color_id,
            "color_name": i.color_name,
            "size_id": i.size_id,
            "size_name": i.size_name,
            "supplier_id": getattr(i, 'supplier_id', None),
            "supplier_name": getattr(i, 'supplier_name', None),
            "uom": i.uom,
            "storage_uom": getattr(i, 'storage_uom', i.uom),
            "purchase_uom": getattr(i, 'purchase_uom', i.uom),
            "uom_conversion_factor": getattr(i, 'uom_conversion_factor', 1.0),
            "cost_price": i.cost_price,
            "selling_price": i.selling_price,
            "mrp": i.mrp,
            "current_stock": stock_lookup.get(i.item_code, None).current_stock if stock_lookup.get(i.item_code) else (i.current_stock or 0),
            "available_stock": stock_lookup.get(i.item_code, None).available_stock if stock_lookup.get(i.item_code) else (i.current_stock or 0),
            "reserved_stock": stock_lookup.get(i.item_code, None).reserved_stock if stock_lookup.get(i.item_code) else 0,
            "image_id": i.image_id,
            "image_url": i.image_url,
            "image_name": i.image_name,
            "thumbnail_url": i.thumbnail_url,
            "image_base64": i.image_base64,
            "image_type": i.image_type,
            "is_active": i.is_active,
            # Include specifications from ItemSpecifications document
            "specifications": {
                "colour_code": specs_lookup.get(i.item_code).colour_code if specs_lookup.get(i.item_code) else None,
                "size_code": specs_lookup.get(i.item_code).size_code if specs_lookup.get(i.item_code) else None,
                "uom_code": specs_lookup.get(i.item_code).uom_code if specs_lookup.get(i.item_code) else None,
                "vendor_code": specs_lookup.get(i.item_code).vendor_code if specs_lookup.get(i.item_code) else None,
                "brand_code": specs_lookup.get(i.item_code).brand_code if specs_lookup.get(i.item_code) else None,
                "supplier_code": specs_lookup.get(i.item_code).supplier_code if specs_lookup.get(i.item_code) else None,
                "custom_field_values": specs_lookup.get(i.item_code).custom_field_values if specs_lookup.get(i.item_code) else {}
            }
        }
        for i in items
    ]


@router.get("/{item_code}")
async def get_item(
    item_code: str,
    current_user = Depends(get_current_user)
):
    """Get a specific item by code with specifications"""
    
    item = await ItemMaster.find_one(ItemMaster.item_code == item_code)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item '{item_code}' not found"
        )
    
    # Fetch item specifications if they exist
    specs = None
    try:
        specs = await ItemSpecifications.find_one(
            ItemSpecifications.item_code == item_code.upper()
        )
    except Exception as e:
        logger.warning(f"Could not fetch specifications for item {item_code}: {str(e)}")
    
    # Build response with specifications
    response = {
        "id": str(item.id),
        "uid": getattr(item, 'uid', None),  # Unique Identifier (immutable)
        "item_code": item.item_code,
        "item_name": item.item_name,
        "item_description": item.item_description,
        # SKU Fields (can change based on item attributes)
        "sku": item.sku,
        "sku_type_code": item.sku_type_code,
        "sku_category_code": item.sku_category_code,
        "sku_sequence": item.sku_sequence,
        "sku_variant1": item.sku_variant1,
        "sku_variant2": item.sku_variant2,
        "category_code": item.category_code,
        "category_name": item.category_name,
        "sub_category_code": item.sub_category_code,
        "sub_category_name": item.sub_category_name,
        "division_code": item.division_code,
        "division_name": item.division_name,
        "class_code": item.class_code,
        "class_name": item.class_name,
        "sub_class_code": item.sub_class_code,
        "sub_class_name": item.sub_class_name,
        "hierarchy_path": item.hierarchy_path,
        "hierarchy_path_name": item.hierarchy_path_name,
        "color_id": item.color_id,
        "color_name": item.color_name,
        "size_id": item.size_id,
        "size_name": item.size_name,
        "brand_id": item.brand_id,
        "brand_name": item.brand_name,
        "supplier_id": getattr(item, 'supplier_id', None),
        "supplier_name": getattr(item, 'supplier_name', None),
        "uom": item.uom,
        "storage_uom": getattr(item, 'storage_uom', item.uom),
        "purchase_uom": getattr(item, 'purchase_uom', item.uom),
        "uom_conversion_factor": getattr(item, 'uom_conversion_factor', 1.0),
        "inventory_type": item.inventory_type,
        "cost_price": item.cost_price,
        "selling_price": item.selling_price,
        "mrp": item.mrp,
        "hsn_code": item.hsn_code,
        "gst_rate": item.gst_rate,
        "warehouse_id": item.warehouse_id,
        "warehouse_name": item.warehouse_name,
        "bin_location": item.bin_location,
        "min_stock_level": item.min_stock_level,
        "max_stock_level": item.max_stock_level,
        "reorder_point": item.reorder_point,
        "reorder_quantity": item.reorder_quantity,
        "current_stock": item.current_stock,
        "opening_stock": item.opening_stock,
        "barcode": item.barcode,
        "serial_tracked": item.serial_tracked,
        "batch_tracked": item.batch_tracked,
        "image_id": item.image_id,
        "image_url": item.image_url,
        "image_name": item.image_name,
        "thumbnail_url": item.thumbnail_url,
        "image_base64": item.image_base64,
        "image_type": item.image_type,
        "image_size": item.image_size,
        "is_active": item.is_active,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
        # Add specifications if they exist
        "specifications": {
            "colour_code": specs.colour_code if specs else None,
            "size_code": specs.size_code if specs else None,
            "uom_code": specs.uom_code if specs else None,
            "vendor_code": specs.vendor_code if specs else None,
            "brand_code": specs.brand_code if specs else None,
            "supplier_code": specs.supplier_code if specs else None,
            "custom_field_values": specs.custom_field_values if specs else {}
        }
    }
    
    return response


@router.put("/{item_code}")
async def update_item(
    item_code: str,
    data: ItemMasterUpdate,
    current_user = Depends(get_current_user)
):
    """Update an item"""
    
    item = await ItemMaster.find_one(ItemMaster.item_code == item_code)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item '{item_code}' not found"
        )
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    
    item.updated_at = datetime.utcnow()
    item.updated_by = str(current_user.id) if current_user else None
    await item.save()
    
    return {"message": "Item updated successfully", "item_code": item_code}


@router.get("/next-sku/{prefix}")
async def get_next_sku(prefix: str):
    """Get next available SKU for given prefix (item type code)"""
    try:
        # Normalize prefix to 2 uppercase letters
        prefix = prefix[:2].upper()

        # Find all NON-DELETED items with this prefix (both old and new format)
        # New format: RM-BTNS-A0001-0000-00
        # Old format: RM00001
        items = await ItemMaster.find(
            {
                "$or": [
                    {"item_code": {"$regex": f"^{prefix}\\d{{5}}$"}},  # Old format
                    {"item_code": {"$regex": f"^{prefix}-"}},  # New format
                    {"sku": {"$regex": f"^{prefix}-"}}  # New format in sku field
                ],
                "deleted_at": None  # Exclude deleted items
            }
        ).to_list()

        if not items:
            # No items with this prefix yet, start from 1
            return {"next_sku": f"{prefix}00001", "sequence": 1}

        # Extract sequence numbers from both old and new formats
        max_sequence = 0
        for item in items:
            try:
                # Try new format first: RM-BTNS-A0001-0000-00
                # The sequence is in the third part after splitting by '-'
                sku_to_check = item.sku if item.sku else item.item_code
                
                if '-' in sku_to_check:
                    # New format: extract sequence from third part (A0001)
                    parts = sku_to_check.split('-')
                    if len(parts) >= 3:
                        sequence_part = parts[2]  # A0001
                        if sequence_part and len(sequence_part) >= 2:
                            # Extract numeric part: A0001 -> 0001 (letter + 4 digits)
                            letter = sequence_part[0]
                            number = int(sequence_part[1:])
                            # Calculate absolute sequence: A=0-9999, B=10000-19999, etc.
                            letter_value = ord(letter) - ord('A')
                            absolute_sequence = (letter_value * 10000) + number
                            if absolute_sequence > max_sequence:
                                max_sequence = absolute_sequence
                else:
                    # Old format: RM00001
                    numeric_part = int(item.item_code[2:])
                    if numeric_part > max_sequence:
                        max_sequence = numeric_part
            except (ValueError, IndexError, AttributeError):
                continue

        # Generate next sequence
        next_sequence = max_sequence + 1

        return {"next_sku": f"{prefix}{str(next_sequence).zfill(5)}", "sequence": next_sequence}
    except Exception as e:
        logger.error(f"Error generating next SKU: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate next SKU: {str(e)}"
        )


@router.get("/generate-uid")
async def generate_uid_preview(
    item_type_code: str = Query(..., description="Item Type Code (e.g., FG, RM)"),
    category_code: str = Query(..., description="Category Code (e.g., RNCK, BTNS)"),
):
    """
    Preview the next UID that will be generated for a new item

    UID Format: [ItemTypeCode 2 chars][CategoryCode 2 chars][4 digit counter]
    Example: FGRN0001, RMBT0002, TRPK0001

    Components:
    1. Item Type Code (2 chars): From item type (e.g., FG, RM, TR)
    2. Category Code (2 chars): First 2 letters of category code
    3. Running Counter (4 digits): Auto-increment per type+category combination
    """
    try:
        next_uid = await generate_uid(item_type_code, category_code)

        type_code = item_type_code.upper()[:2].ljust(2, "X")
        cat_code = category_code.upper()[:2].ljust(2, "X")

        return {
            "uid": next_uid,
            "format": "[ItemType 2][Category 2][Counter 4]",
            "components": {
                "item_type_code": type_code,
                "category_code": cat_code,
                "counter": next_uid[-4:],
            },
            "example": f"{type_code}{cat_code}0001"
        }
    except Exception as e:
        logger.error(f"Error generating UID preview: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate UID: {str(e)}"
        )


@router.get("/generate-full-sku")
async def generate_full_sku(
    item_type_code: str = Query(..., description="Item Type Code (e.g., FM, RM)"),
    category_code: str = Query(..., description="Category Code from deepest level (e.g., RNCK)"),
    color: Optional[str] = Query(None, description="Color name for variant (e.g., Navy, Red)"),
    size: Optional[str] = Query(None, description="Size for variant (e.g., M, L, Medium)"),
):
    """
    Generate a complete hierarchical SKU with all 5 components including colour and size

    SKU Format: FM-ABCD-A0000-COLR-SZ
    UID Format: FMAB0001

    Components:
    1. FM = Item Type Code (2 letters)
    2. ABCD = Category Code (2-4 letters from deepest category level)
    3. A0000 = Item Sequence (1 letter + 4 digits, auto-increment per type)
    4. COLR = Color/Variant 1 (4 characters from colour specification)
    5. SZ = Size/Variant 2 (2 characters from size specification)
    """
    try:
        # Get or create ItemType to get next sequence
        item_type_upper = item_type_code.upper()
        item_type = await ItemType.find_one(ItemType.type_code == item_type_upper)

        if not item_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Item Type '{item_type_code}' not found"
            )

        # Get current sequence and increment
        current_sequence = max((item_type.next_item_sequence or 0) + 1, 1)

        # Generate all SKU components safely
        try:
            type_code = SKUService.generate_item_type_code(item_type.type_name)
        except:
            type_code = item_type_upper[:2]

        category_code_upper = category_code.upper()[:4]

        try:
            sequence_code = SKUService.generate_item_sequence_code(current_sequence)
        except:
            # Fallback: simple sequence generation
            sequence_code = f"A{str(current_sequence).zfill(4)}"

        # Generate variant codes from colour and size specifications
        try:
            variant1_code = SKUService.generate_variant_code(color, "color", 4) if color else "0000"
        except:
            variant1_code = "0000"

        try:
            variant2_code = SKUService.generate_variant_code(size, "size", 2) if size else "00"
        except:
            variant2_code = "00"

        # Construct full SKU
        full_sku = f"{type_code}-{category_code_upper}-{sequence_code}-{variant1_code}-{variant2_code}"

        # Also generate the new UID format
        uid_preview = await generate_uid(item_type_code, category_code)

        return {
            "sku": full_sku,
            "uid": uid_preview,
            "components": {
                "type_code": type_code,
                "category_code": category_code_upper,
                "sequence_code": sequence_code,
                "variant1_code": variant1_code,
                "variant2_code": variant2_code,
                "color_name": color,
                "size_name": size,
            },
            "next_sequence_number": current_sequence,
            "display": f"{type_code}-{category_code_upper}-{sequence_code}-{variant1_code}-{variant2_code}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating full SKU: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate full SKU: {str(e)}"
        )


@router.delete("/{item_code}")
async def delete_item(
    item_code: str,
    current_user = Depends(get_current_user)
):
    """Soft delete an item (move to bin)"""
    
    item = await ItemMaster.find_one(ItemMaster.item_code == item_code)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item '{item_code}' not found"
        )
    
    if item.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Item '{item_code}' is already in bin"
        )
    
    item.deleted_at = datetime.utcnow()
    item.deleted_by = str(current_user.id) if current_user else None
    item.is_active = False
    item.updated_at = datetime.utcnow()
    item.updated_by = str(current_user.id) if current_user else None
    await item.save()
    
    return {"message": "Item moved to bin successfully", "item_code": item_code}


# ==================== BIN MANAGEMENT ROUTES ====================

@router.get("/bin/list")
async def list_bin_items(
    current_user = Depends(get_current_user)
):
    """List all items in bin (deleted items)"""
    
    # Find all deleted items
    items = await ItemMaster.find(ItemMaster.deleted_at != None).to_list()
    
    # Calculate days in bin and filter items older than 10 days
    now = datetime.utcnow()
    result = []
    
    for item in items:
        if item.deleted_at:
            days_in_bin = (now - item.deleted_at).days
            
            result.append({
                "id": str(item.id),
                "item_code": item.item_code,
                "item_name": item.item_name,
                "category_name": item.category_name,
                "sub_category_name": item.sub_category_name,
                "deleted_at": item.deleted_at.isoformat(),
                "deleted_by": item.deleted_by,
                "days_in_bin": days_in_bin,
                "can_restore": days_in_bin <= 10
            })
    
    return result


@router.post("/bin/restore/{item_code}")
async def restore_item(
    item_code: str,
    current_user = Depends(get_current_user)
):
    """Restore an item from bin"""
    
    item = await ItemMaster.find_one(ItemMaster.item_code == item_code)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item '{item_code}' not found"
        )
    
    if not item.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Item '{item_code}' is not in bin"
        )
    
    # Check if within 10 days
    days_in_bin = (datetime.utcnow() - item.deleted_at).days
    if days_in_bin > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot restore item after 10 days (currently {days_in_bin} days in bin)"
        )
    
    # Restore the item
    item.deleted_at = None
    item.deleted_by = None
    item.is_active = True
    item.updated_at = datetime.utcnow()
    item.updated_by = str(current_user.id) if current_user else None
    await item.save()
    
    return {"message": "Item restored successfully", "item_code": item_code}


@router.delete("/bin/permanent/{item_code}")
async def permanent_delete_item(
    item_code: str,
    current_user = Depends(get_current_user)
):
    """Permanently delete an item from bin"""
    
    item = await ItemMaster.find_one(ItemMaster.item_code == item_code)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item '{item_code}' not found"
        )
    
    if not item.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Item '{item_code}' is not in bin. Move to bin first before permanent deletion."
        )
    
    # Store item code for response
    deleted_code = item.item_code
    
    # Permanently delete from database
    await item.delete()
    
    return {
        "message": "Item permanently deleted", 
        "item_code": deleted_code,
        "note": "SKU is now available for reuse"
    }


@router.post("/bin/cleanup")
async def cleanup_old_bin_items(
    current_user = Depends(get_current_user)
):
    """Automatically delete items in bin older than 10 days"""
    
    # Find all deleted items older than 10 days
    ten_days_ago = datetime.utcnow() - timedelta(days=10)
    old_items = await ItemMaster.find(
        ItemMaster.deleted_at != None,
        ItemMaster.deleted_at < ten_days_ago
    ).to_list()
    
    deleted_count = 0
    deleted_codes = []
    
    for item in old_items:
        deleted_codes.append(item.item_code)
        await item.delete()
        deleted_count += 1
    
    return {
        "message": f"Cleaned up {deleted_count} items from bin",
        "deleted_codes": deleted_codes
    }
