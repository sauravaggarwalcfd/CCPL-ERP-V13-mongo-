from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
import logging
import re
from datetime import datetime
from ..models.item import (
    ItemCategory, ItemSubCategory, ItemMaster,
    ItemCategoryCreate, ItemCategoryResponse,
    ItemSubCategoryCreate, ItemSubCategoryResponse,
    ItemMasterCreate, ItemMasterResponse,
    InventoryType, InventoryClassType, UnitOfMeasure
)
from ..core.dependencies import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


# ==================== ITEM CATEGORY ROUTES ====================

@router.post("/categories", response_model=ItemCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_item_category(
    data: ItemCategoryCreate,
    current_user = Depends(get_current_user)
):
    """Create a new Item Category - Requires inventory_class and selected_uoms"""
    
    # Generate category_id if not provided
    category_id = data.category_id
    if not category_id:
        if data.category_code:
            category_id = data.category_code.upper()
        elif data.category_name:
            category_id = data.category_name[:4].upper().replace(' ', '')
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either category_id, category_code, or category_name must be provided"
            )
    
    # Check if category already exists
    existing = await ItemCategory.find_one(ItemCategory.category_id == category_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Item Category with ID '{category_id}' already exists"
        )
    
    # Validate category code format (max 4 alphabets only)
    if data.category_code:
        if not re.match(r'^[A-Za-z]{1,4}$', data.category_code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category code must be 1-4 alphabetic characters only"
            )
        
        # Check if category code exists
        existing_code = await ItemCategory.find_one(ItemCategory.category_code == data.category_code.upper())
        if existing_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category code '{data.category_code}' already exists"
            )
    
    # Validate selected_uoms
    if not data.selected_uoms or len(data.selected_uoms) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one Unit of Measure must be selected"
        )
    
    category_data = data.dict()
    category_data['category_id'] = category_id
    category_data['category_code'] = (data.category_code or category_id).upper()
    category_data['category_name'] = (data.category_name or category_id).upper()
    
    category = ItemCategory(**category_data)
    
    await category.save()
    logger.info(f"Created Item Category: {category_id} - {category.category_name}")
    
    return ItemCategoryResponse(
        id=str(category.id),
        category_id=category.category_id,
        category_name=category.category_name,
        category_code=category.category_code,
        description=category.description,
        parent_category_id=category.parent_category_id,
        parent_category_name=category.parent_category_name,
        level=category.level,
        inventory_class=category.inventory_class,
        selected_uoms=category.selected_uoms or [],
        waste_percentage=category.waste_percentage,
        reorder_point=category.reorder_point,
        lead_time_days=category.lead_time_days,
        preferred_supplier_id=category.preferred_supplier_id,
        preferred_supplier_name=category.preferred_supplier_name,
        standard_cost=category.standard_cost,
        requires_batch_tracking=category.requires_batch_tracking,
        requires_expiry_tracking=category.requires_expiry_tracking,
        quality_check_required=category.quality_check_required,
        storage_requirements=category.storage_requirements,
        handling_instructions=category.handling_instructions,
        sort_order=category.sort_order,
        is_active=category.is_active,
        created_at=category.created_at,
        updated_at=category.updated_at,
    )


@router.get("/categories", response_model=List[ItemCategoryResponse])
async def list_item_categories(
    skip: int = 0,
    limit: int = 50,
    active_only: bool = True,
    current_user = Depends(get_current_user)
):
    """List all Item Categories - only returns categories with inventory_class"""
    
    # Filter for categories that have inventory_class (skip old records without it)
    if active_only:
        query = ItemCategory.find(
            ItemCategory.is_active == True,
            ItemCategory.inventory_class != None
        )
    else:
        query = ItemCategory.find(ItemCategory.inventory_class != None)
    
    categories = await query.skip(skip).limit(limit).to_list()
    
    return [
        ItemCategoryResponse(
            id=str(cat.id),
            category_id=cat.category_id,
            category_name=cat.category_name,
            category_code=cat.category_code,
            description=cat.description,
            parent_category_id=cat.parent_category_id,
            parent_category_name=cat.parent_category_name,
            level=cat.level,
            inventory_class=cat.inventory_class,
            selected_uoms=cat.selected_uoms or [],
            waste_percentage=cat.waste_percentage,
            reorder_point=cat.reorder_point,
            lead_time_days=cat.lead_time_days,
            preferred_supplier_id=cat.preferred_supplier_id,
            preferred_supplier_name=cat.preferred_supplier_name,
            standard_cost=cat.standard_cost,
            requires_batch_tracking=cat.requires_batch_tracking,
            requires_expiry_tracking=cat.requires_expiry_tracking,
            quality_check_required=cat.quality_check_required,
            storage_requirements=cat.storage_requirements,
            handling_instructions=cat.handling_instructions,
            sort_order=cat.sort_order,
            is_active=cat.is_active,
            created_at=cat.created_at,
            updated_at=cat.updated_at,
        )
        for cat in categories
    ]


@router.get("/categories/{category_id}", response_model=ItemCategoryResponse)
async def get_item_category(
    category_id: str,
    current_user = Depends(get_current_user)
):
    """Get specific Item Category"""
    
    category = await ItemCategory.find_one(ItemCategory.category_id == category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item Category '{category_id}' not found"
        )
    
    return ItemCategoryResponse(
        id=str(category.id),
        **category.dict(exclude={"id"}),
    )


@router.put("/categories/{category_id}", response_model=ItemCategoryResponse)
async def update_item_category(
    category_id: str,
    data: ItemCategoryCreate,
    current_user = Depends(get_current_user)
):
    """Update an Item Category - Requires inventory_class and selected_uoms"""
    
    category = await ItemCategory.find_one(ItemCategory.category_id == category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item Category '{category_id}' not found"
        )
    
    # Check if new category_id already exists (if different from current)
    if data.category_id and data.category_id != category_id:
        existing = await ItemCategory.find_one(ItemCategory.category_id == data.category_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Item Category with ID '{data.category_id}' already exists"
            )
    
    # Validate category code format (max 4 alphabets only)
    if data.category_code:
        if not re.match(r'^[A-Za-z]{1,4}$', data.category_code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category code must be 1-4 alphabetic characters only"
            )
        
        # Check if category code exists (if changing it)
        if data.category_code != category.category_code:
            existing_code = await ItemCategory.find_one(ItemCategory.category_code == data.category_code.upper())
            if existing_code:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Category code '{data.category_code}' already exists"
                )
    
    # Validate selected_uoms
    if not data.selected_uoms or len(data.selected_uoms) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one Unit of Measure must be selected"
        )
    
    # Check if inventory_class is changing and if category has children
    if data.inventory_class and data.inventory_class != category.inventory_class:
        children = await ItemCategory.find(ItemCategory.parent_category_id == category_id).to_list()
        if children:
            # Update all children with new inventory_class
            for child in children:
                child.inventory_class = data.inventory_class
                child.updated_at = datetime.utcnow()
                await child.save()
            logger.info(f"Updated inventory_class for {len(children)} child categories of {category_id}")
    
    # Update all fields from data - enforce uppercase
    for field, value in data.dict(exclude_unset=True).items():
        if field == 'category_name' and value:
            setattr(category, field, value.upper())
        elif field == 'category_code' and value:
            setattr(category, field, value.upper())
        else:
            setattr(category, field, value)
    
    category.updated_at = datetime.utcnow()
    
    await category.save()
    logger.info(f"Updated Item Category: {category_id}")
    
    return ItemCategoryResponse(
        id=str(category.id),
        **category.dict(exclude={"id"}),
    )


@router.delete("/categories/{category_id}")
async def delete_item_category(
    category_id: str,
    current_user = Depends(get_current_user)
):
    """Delete an Item Category"""
    
    category = await ItemCategory.find_one(ItemCategory.category_id == category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item Category '{category_id}' not found"
        )
    
    await category.delete()
    logger.info(f"Deleted Item Category: {category_id}")
    
    return {"message": f"Category '{category_id}' deleted successfully"}


@router.get("/categories/hierarchy")
async def get_category_hierarchy(
    current_user = Depends(get_current_user)
):
    """Get full category hierarchy tree"""
    
    # Get all categories
    all_categories = await ItemCategory.find().to_list()
    
    # Build hierarchy
    def build_tree(parent_id=None):
        children = []
        for cat in all_categories:
            if cat.parent_category_id == parent_id:
                node = {
                    "id": str(cat.id),
                    "category_id": cat.category_id,
                    "category_name": cat.category_name,
                    "category_code": cat.category_code,
                    "level": cat.level,
                    "inventory_class": cat.inventory_class,
                    "children": build_tree(cat.category_id)
                }
                children.append(node)
        return children
    
    return build_tree(None)


@router.get("/enums/inventory-classes")
async def get_inventory_classes():
    """Get all inventory class types"""
    return [{"value": item.value, "label": item.value.replace("_", " ").title()} 
            for item in InventoryClassType]


@router.get("/enums/units-of-measure")
async def get_units_of_measure():
    """Get all units of measure"""
    return [{"value": item.value, "label": item.value.upper()} 
            for item in UnitOfMeasure]


# ==================== ITEM SUB-CATEGORY ROUTES ====================

@router.post("/sub-categories", response_model=ItemSubCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_item_sub_category(
    data: ItemSubCategoryCreate,
    current_user = Depends(get_current_user)
):
    """Create a new Item Sub-Category (Level 2) - Must link to valid Item Category"""
    
    # Validate parent category exists
    parent_category = await ItemCategory.find_one(ItemCategory.category_id == data.category_id)
    if not parent_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Parent Item Category '{data.category_id}' not found"
        )
    
    # Check if sub-category already exists
    existing = await ItemSubCategory.find_one(
        ItemSubCategory.sub_category_id == data.sub_category_id
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Item Sub-Category '{data.sub_category_id}' already exists"
        )
    
    sub_category = ItemSubCategory(
        sub_category_id=data.sub_category_id,
        sub_category_name=data.sub_category_name,
        sub_category_code=data.sub_category_code,
        category_id=data.category_id,
        category_name=parent_category.category_name,  # Denormalize
        description=data.description,
    )
    
    await sub_category.save()
    logger.info(f"Created Item Sub-Category: {data.sub_category_id} under {data.category_id}")
    
    return ItemSubCategoryResponse(
        id=str(sub_category.id),
        sub_category_id=sub_category.sub_category_id,
        sub_category_name=sub_category.sub_category_name,
        sub_category_code=sub_category.sub_category_code,
        category_id=sub_category.category_id,
        category_name=sub_category.category_name,
        description=sub_category.description,
        is_active=sub_category.is_active,
        created_at=sub_category.created_at
    )


@router.get("/sub-categories", response_model=List[ItemSubCategoryResponse])
async def list_item_sub_categories(
    category_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    active_only: bool = True,
    current_user = Depends(get_current_user)
):
    """List Item Sub-Categories - optionally filter by parent category"""
    
    filters = []
    if category_id:
        filters.append(ItemSubCategory.category_id == category_id)
    if active_only:
        filters.append(ItemSubCategory.is_active == True)
    
    if filters:
        query = ItemSubCategory.find(*filters)
    else:
        query = ItemSubCategory.find()
    
    sub_categories = await query.skip(skip).limit(limit).to_list()
    
    return [
        ItemSubCategoryResponse(
            id=str(sub_cat.id),
            sub_category_id=sub_cat.sub_category_id,
            sub_category_name=sub_cat.sub_category_name,
            sub_category_code=sub_cat.sub_category_code,
            category_id=sub_cat.category_id,
            category_name=sub_cat.category_name,
            description=sub_cat.description,
            is_active=sub_cat.is_active,
            created_at=sub_cat.created_at
        )
        for sub_cat in sub_categories
    ]


@router.get("/sub-categories/{sub_category_id}", response_model=ItemSubCategoryResponse)
async def get_item_sub_category(
    sub_category_id: str,
    current_user = Depends(get_current_user)
):
    """Get specific Item Sub-Category"""
    
    sub_category = await ItemSubCategory.find_one(
        ItemSubCategory.sub_category_id == sub_category_id
    )
    if not sub_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item Sub-Category '{sub_category_id}' not found"
        )
    
    return ItemSubCategoryResponse(
        id=str(sub_category.id),
        sub_category_id=sub_category.sub_category_id,
        sub_category_name=sub_category.sub_category_name,
        sub_category_code=sub_category.sub_category_code,
        category_id=sub_category.category_id,
        category_name=sub_category.category_name,
        description=sub_category.description,
        is_active=sub_category.is_active,
        created_at=sub_category.created_at
    )


# ==================== ITEM MASTER ROUTES ====================

@router.post("/items", response_model=ItemMasterResponse, status_code=status.HTTP_201_CREATED)
async def create_item_master(
    data: ItemMasterCreate,
    current_user = Depends(get_current_user)
):
    """
    Create a new Item Master record (Level 3)
    Must have valid Category ID and Sub-Category ID
    """
    
    # Validate Item Code uniqueness
    existing_item = await ItemMaster.find_one(ItemMaster.item_code == data.item_code)
    if existing_item:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Item with code '{data.item_code}' already exists"
        )
    
    # Validate Category exists
    category = await ItemCategory.find_one(ItemCategory.category_id == data.category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Item Category '{data.category_id}' not found"
        )
    
    # Validate Sub-Category exists and belongs to this category
    sub_category = await ItemSubCategory.find_one(
        ItemSubCategory.sub_category_id == data.sub_category_id
    )
    if not sub_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Item Sub-Category '{data.sub_category_id}' not found"
        )
    
    if sub_category.category_id != data.category_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sub-Category '{data.sub_category_id}' does not belong to Category '{data.category_id}'"
        )
    
    # Create Item Master
    item = ItemMaster(
        item_code=data.item_code,
        item_name=data.item_name,
        item_description=data.item_description,
        category_id=data.category_id,
        category_name=category.category_name,
        sub_category_id=data.sub_category_id,
        sub_category_name=sub_category.sub_category_name,
        color_id=data.color_id,
        size_id=data.size_id,
        brand_id=data.brand_id,
        uom=data.uom,
        inventory_type=data.inventory_type,
        cost_price=data.cost_price,
        selling_price=data.selling_price,
        mrp=data.mrp,
        hsn_code=data.hsn_code,
        gst_rate=data.gst_rate,
        warehouse_id=data.warehouse_id,
        bin_location=data.bin_location,
        min_stock_level=data.min_stock_level,
        max_stock_level=data.max_stock_level,
        reorder_point=data.reorder_point,
        reorder_quantity=data.reorder_quantity,
        material=data.material,
        weight=data.weight,
        care_instructions=data.care_instructions,
        barcode=data.barcode,
        created_by=str(current_user.id),
    )
    
    await item.save()
    logger.info(f"Created Item: {data.item_code} - {data.item_name}")
    
    return ItemMasterResponse(
        id=str(item.id),
        item_code=item.item_code,
        item_name=item.item_name,
        item_description=item.item_description,
        category_id=item.category_id,
        category_name=item.category_name,
        sub_category_id=item.sub_category_id,
        sub_category_name=item.sub_category_name,
        color_id=item.color_id,
        color_name=item.color_name,
        size_id=item.size_id,
        size_name=item.size_name,
        brand_id=item.brand_id,
        brand_name=item.brand_name,
        uom=item.uom,
        inventory_type=item.inventory_type,
        cost_price=item.cost_price,
        selling_price=item.selling_price,
        mrp=item.mrp,
        hsn_code=item.hsn_code,
        gst_rate=item.gst_rate,
        warehouse_id=item.warehouse_id,
        warehouse_name=item.warehouse_name,
        bin_location=item.bin_location,
        min_stock_level=item.min_stock_level,
        max_stock_level=item.max_stock_level,
        reorder_point=item.reorder_point,
        reorder_quantity=item.reorder_quantity,
        material=item.material,
        weight=item.weight,
        care_instructions=item.care_instructions,
        barcode=item.barcode,
        current_stock=item.current_stock,
        is_active=item.is_active,
        created_at=item.created_at,
        updated_at=item.updated_at
    )


@router.get("/items", response_model=List[ItemMasterResponse])
async def list_items(
    category_id: Optional[str] = None,
    sub_category_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    active_only: bool = True,
    current_user = Depends(get_current_user)
):
    """List Item Master records - optionally filter by category"""
    
    filters = []
    if category_id:
        filters.append(ItemMaster.category_id == category_id)
    if sub_category_id:
        filters.append(ItemMaster.sub_category_id == sub_category_id)
    if active_only:
        filters.append(ItemMaster.is_active == True)
    
    if filters:
        query = ItemMaster.find(*filters)
    else:
        query = ItemMaster.find()
    
    items = await query.skip(skip).limit(limit).to_list()
    
    return [
        ItemMasterResponse(
            id=str(item.id),
            item_code=item.item_code,
            item_name=item.item_name,
            item_description=item.item_description,
            category_id=item.category_id,
            category_name=item.category_name,
            sub_category_id=item.sub_category_id,
            sub_category_name=item.sub_category_name,
            color_id=item.color_id,
            color_name=item.color_name,
            size_id=item.size_id,
            size_name=item.size_name,
            brand_id=item.brand_id,
            brand_name=item.brand_name,
            uom=item.uom,
            inventory_type=item.inventory_type,
            cost_price=item.cost_price,
            selling_price=item.selling_price,
            mrp=item.mrp,
            hsn_code=item.hsn_code,
            gst_rate=item.gst_rate,
            warehouse_id=item.warehouse_id,
            warehouse_name=item.warehouse_name,
            bin_location=item.bin_location,
            min_stock_level=item.min_stock_level,
            max_stock_level=item.max_stock_level,
            reorder_point=item.reorder_point,
            reorder_quantity=item.reorder_quantity,
            material=item.material,
            weight=item.weight,
            care_instructions=item.care_instructions,
            barcode=item.barcode,
            current_stock=item.current_stock,
            is_active=item.is_active,
            created_at=item.created_at,
            updated_at=item.updated_at
        )
        for item in items
    ]


@router.get("/items/{item_code}", response_model=ItemMasterResponse)
async def get_item(
    item_code: str,
    current_user = Depends(get_current_user)
):
    """Get specific Item Master record"""
    
    item = await ItemMaster.find_one(ItemMaster.item_code == item_code)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item '{item_code}' not found"
        )
    
    return ItemMasterResponse(
        id=str(item.id),
        item_code=item.item_code,
        item_name=item.item_name,
        item_description=item.item_description,
        category_id=item.category_id,
        category_name=item.category_name,
        sub_category_id=item.sub_category_id,
        sub_category_name=item.sub_category_name,
        color_id=item.color_id,
        color_name=item.color_name,
        size_id=item.size_id,
        size_name=item.size_name,
        brand_id=item.brand_id,
        brand_name=item.brand_name,
        uom=item.uom,
        inventory_type=item.inventory_type,
        cost_price=item.cost_price,
        selling_price=item.selling_price,
        mrp=item.mrp,
        hsn_code=item.hsn_code,
        gst_rate=item.gst_rate,
        warehouse_id=item.warehouse_id,
        warehouse_name=item.warehouse_name,
        bin_location=item.bin_location,
        min_stock_level=item.min_stock_level,
        max_stock_level=item.max_stock_level,
        reorder_point=item.reorder_point,
        reorder_quantity=item.reorder_quantity,
        material=item.material,
        weight=item.weight,
        care_instructions=item.care_instructions,
        barcode=item.barcode,
        current_stock=item.current_stock,
        is_active=item.is_active,
        created_at=item.created_at,
        updated_at=item.updated_at
    )
