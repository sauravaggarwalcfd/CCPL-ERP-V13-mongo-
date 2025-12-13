from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
import logging
from ..models.item import (
    ItemCategory, ItemSubCategory, ItemMaster,
    ItemCategoryCreate, ItemCategoryResponse,
    ItemSubCategoryCreate, ItemSubCategoryResponse,
    ItemMasterCreate, ItemMasterResponse,
    InventoryType
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
    """Create a new Item Category (Level 1)"""
    
    # Check if category already exists
    existing = await ItemCategory.find_one(ItemCategory.category_id == data.category_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Item Category with ID '{data.category_id}' already exists"
        )
    
    category = ItemCategory(
        category_id=data.category_id,
        category_name=data.category_name,
        category_code=data.category_code,
        description=data.description,
        parent_category_id=data.parent_category_id,
    )
    
    await category.save()
    logger.info(f"Created Item Category: {data.category_id} - {data.category_name}")
    
    return ItemCategoryResponse(
        id=str(category.id),
        category_id=category.category_id,
        category_name=category.category_name,
        category_code=category.category_code,
        description=category.description,
        parent_category_id=category.parent_category_id,
        is_active=category.is_active,
        created_at=category.created_at
    )


@router.get("/categories", response_model=List[ItemCategoryResponse])
async def list_item_categories(
    skip: int = 0,
    limit: int = 50,
    active_only: bool = True,
    current_user = Depends(get_current_user)
):
    """List all Item Categories"""
    
    query = ItemCategory.find()
    if active_only:
        query = query.where(ItemCategory.is_active == True)
    
    categories = await query.skip(skip).limit(limit).to_list()
    
    return [
        ItemCategoryResponse(
            id=str(cat.id),
            category_id=cat.category_id,
            category_name=cat.category_name,
            category_code=cat.category_code,
            description=cat.description,
            parent_category_id=cat.parent_category_id,
            is_active=cat.is_active,
            created_at=cat.created_at
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
        category_id=category.category_id,
        category_name=category.category_name,
        category_code=category.category_code,
        description=category.description,
        parent_category_id=category.parent_category_id,
        is_active=category.is_active,
        created_at=category.created_at
    )


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
    
    query = ItemSubCategory.find()
    
    if category_id:
        query = query.where(ItemSubCategory.category_id == category_id)
    
    if active_only:
        query = query.where(ItemSubCategory.is_active == True)
    
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
    
    query = ItemMaster.find()
    
    if category_id:
        query = query.where(ItemMaster.category_id == category_id)
    
    if sub_category_id:
        query = query.where(ItemMaster.sub_category_id == sub_category_id)
    
    if active_only:
        query = query.where(ItemMaster.is_active == True)
    
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
