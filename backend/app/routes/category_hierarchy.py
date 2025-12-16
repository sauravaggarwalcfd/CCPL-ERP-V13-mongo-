"""
Category Hierarchy API Routes - FIXED VERSION
CRUD operations for 5-level category hierarchy
Uses insert() instead of save() to avoid Beanie initialization issues
"""

from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime
import logging

from ..models.category_hierarchy import (
    ItemCategory, ItemSubCategory, ItemDivision, ItemClass, ItemSubClass,
    ItemCategoryCreate, ItemSubCategoryCreate, ItemDivisionCreate, ItemClassCreate, ItemSubClassCreate,
    ItemCategoryUpdate, ItemSubCategoryUpdate, ItemDivisionUpdate, ItemClassUpdate, ItemSubClassUpdate,
    SEED_CATEGORIES, SEED_SUB_CATEGORIES, SEED_DIVISIONS, SEED_CLASSES, SEED_SUB_CLASSES,
)

router = APIRouter()
logger = logging.getLogger(__name__)


# ==================== HELPER FUNCTIONS ====================

def build_path(codes: List[str]) -> str:
    return "/".join(codes)

def build_path_name(names: List[str]) -> str:
    return " > ".join(names)


# ==================== LEVEL 1: CATEGORIES ====================

@router.get("/categories", response_model=List[dict])
async def list_categories(
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
):
    """List all Level 1 categories"""
    
    if is_active is not None:
        categories = await ItemCategory.find(
            ItemCategory.is_active == is_active
        ).sort("sort_order").to_list()
    else:
        categories = await ItemCategory.find_all().sort("sort_order").to_list()
    
    if search:
        search_lower = search.lower()
        categories = [c for c in categories if search_lower in c.category_name.lower() or search_lower in c.category_code.lower()]
    
    return [
        {
            "id": str(c.id),
            "level": 1,
            "code": c.category_code,
            "name": c.category_name,
            "description": c.description,
            "path": c.category_code,
            "path_name": c.category_name,
            "item_type": c.item_type,
            "has_color": c.has_color,
            "has_size": c.has_size,
            "has_fabric": c.has_fabric,
            "default_hsn_code": c.default_hsn_code,
            "default_gst_rate": c.default_gst_rate,
            "icon": c.icon,
            "color_code": c.color_code,
            "sort_order": c.sort_order,
            "is_active": c.is_active,
            "child_count": c.child_count,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
        }
        for c in categories
    ]


@router.get("/categories/{code}")
async def get_category(code: str):
    """Get a single category by code"""
    
    category = await ItemCategory.find_one(ItemCategory.category_code == code.upper())
    
    if not category:
        raise HTTPException(status_code=404, detail=f"Category '{code}' not found")
    
    return {
        "id": str(category.id),
        "level": 1,
        "code": category.category_code,
        "name": category.category_name,
        "description": category.description,
        "path": category.category_code,
        "path_name": category.category_name,
        "item_type": getattr(category, 'item_type', 'FG'),
        "has_color": category.has_color,
        "has_size": category.has_size,
        "has_fabric": category.has_fabric,
        "has_brand": category.has_brand,
        "has_style": category.has_style,
        "has_season": category.has_season,
        "default_hsn_code": category.default_hsn_code,
        "default_gst_rate": category.default_gst_rate,
        "default_uom": category.default_uom,
        "icon": category.icon,
        "color_code": category.color_code,
        "sort_order": category.sort_order,
        "is_active": category.is_active,
        "child_count": category.child_count,
    }


@router.post("/categories", status_code=201)
async def create_category(data: ItemCategoryCreate):
    """Create a new Level 1 category"""
    
    existing = await ItemCategory.find_one(ItemCategory.category_code == data.category_code.upper())
    if existing:
        raise HTTPException(status_code=400, detail=f"Category '{data.category_code}' already exists")
    
    # Use insert() instead of save()
    category = await ItemCategory(
        category_code=data.category_code.upper(),
        category_name=data.category_name,
        description=data.description,
        item_type=data.item_type,
        has_color=data.has_color,
        has_size=data.has_size,
        has_fabric=data.has_fabric,
        has_brand=data.has_brand,
        has_style=data.has_style,
        has_season=data.has_season,
        default_hsn_code=data.default_hsn_code,
        default_gst_rate=data.default_gst_rate,
        default_uom=data.default_uom,
        icon=data.icon,
        color_code=data.color_code,
        sort_order=data.sort_order,
    ).insert()
    
    logger.info(f"Created category: {category.category_code}")
    
    return {"message": "Category created", "code": category.category_code}


@router.put("/categories/{code}")
async def update_category(code: str, data: ItemCategoryUpdate):
    """Update a category"""
    
    category = await ItemCategory.find_one(ItemCategory.category_code == code.upper())
    if not category:
        raise HTTPException(status_code=404, detail=f"Category '{code}' not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)
    
    category.updated_at = datetime.utcnow()
    await category.save()
    
    return {"message": "Category updated", "code": category.category_code}


@router.delete("/categories/{code}")
async def delete_category(code: str):
    """Soft delete a category"""
    
    category = await ItemCategory.find_one(ItemCategory.category_code == code.upper())
    if not category:
        raise HTTPException(status_code=404, detail=f"Category '{code}' not found")
    
    # Check for children
    children = await ItemSubCategory.find(ItemSubCategory.category_code == code.upper()).count()
    if children > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete: {children} sub-categories exist")
    
    category.is_active = False
    category.updated_at = datetime.utcnow()
    await category.save()
    
    return {"message": "Category deactivated", "code": code}


# ==================== LEVEL 2: SUB-CATEGORIES ====================

@router.get("/sub-categories", response_model=List[dict])
async def list_sub_categories(
    category_code: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
):
    """List Level 2 sub-categories, optionally filtered by parent"""
    
    query_conditions = []
    
    if category_code:
        query_conditions.append(ItemSubCategory.category_code == category_code.upper())
    if is_active is not None:
        query_conditions.append(ItemSubCategory.is_active == is_active)
    
    if query_conditions:
        items = await ItemSubCategory.find(*query_conditions).sort("sort_order").to_list()
    else:
        items = await ItemSubCategory.find_all().sort("sort_order").to_list()
    
    return [
        {
            "id": str(i.id),
            "level": 2,
            "code": i.sub_category_code,
            "name": i.sub_category_name,
            "description": i.description,
            "category_code": i.category_code,
            "category_name": i.category_name,
            "path": i.path,
            "path_name": i.path_name,
            "icon": i.icon,
            "color_code": i.color_code,
            "sort_order": i.sort_order,
            "is_active": i.is_active,
            "child_count": i.child_count,
        }
        for i in items
    ]


@router.post("/sub-categories", status_code=201)
async def create_sub_category(data: ItemSubCategoryCreate):
    """Create a new Level 2 sub-category"""
    
    # Validate parent
    parent = await ItemCategory.find_one(ItemCategory.category_code == data.category_code.upper())
    if not parent:
        raise HTTPException(status_code=400, detail=f"Parent category '{data.category_code}' not found")
    
    # Check unique
    existing = await ItemSubCategory.find_one(ItemSubCategory.sub_category_code == data.sub_category_code.upper())
    if existing:
        raise HTTPException(status_code=400, detail=f"Sub-category '{data.sub_category_code}' already exists")
    
    # Use insert() instead of save()
    item = await ItemSubCategory(
        sub_category_code=data.sub_category_code.upper(),
        sub_category_name=data.sub_category_name,
        description=data.description,
        category_code=parent.category_code,
        category_name=parent.category_name,
        path=build_path([parent.category_code, data.sub_category_code.upper()]),
        path_name=build_path_name([parent.category_name, data.sub_category_name]),
        has_color=data.has_color,
        has_size=data.has_size,
        has_fabric=data.has_fabric,
        icon=data.icon,
        color_code=data.color_code,
        sort_order=data.sort_order,
    ).insert()
    
    # Update parent count
    parent.child_count = await ItemSubCategory.find(ItemSubCategory.category_code == parent.category_code).count()
    await parent.save()
    
    return {"message": "Sub-category created", "code": item.sub_category_code}


@router.put("/sub-categories/{code}")
async def update_sub_category(code: str, data: ItemSubCategoryUpdate):
    """Update a sub-category"""
    
    item = await ItemSubCategory.find_one(ItemSubCategory.sub_category_code == code.upper())
    if not item:
        raise HTTPException(status_code=404, detail=f"Sub-category '{code}' not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    
    # Update path_name if name changed
    if data.sub_category_name:
        item.path_name = build_path_name([item.category_name, data.sub_category_name])
    
    item.updated_at = datetime.utcnow()
    await item.save()
    
    return {"message": "Sub-category updated", "code": item.sub_category_code}


@router.delete("/sub-categories/{code}")
async def delete_sub_category(code: str):
    """Soft delete a sub-category"""
    
    item = await ItemSubCategory.find_one(ItemSubCategory.sub_category_code == code.upper())
    if not item:
        raise HTTPException(status_code=404, detail=f"Sub-category '{code}' not found")
    
    children = await ItemDivision.find(ItemDivision.sub_category_code == code.upper()).count()
    if children > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete: {children} divisions exist")
    
    item.is_active = False
    item.updated_at = datetime.utcnow()
    await item.save()
    
    return {"message": "Sub-category deactivated", "code": code}


# ==================== LEVEL 3: DIVISIONS ====================

@router.get("/divisions", response_model=List[dict])
async def list_divisions(
    category_code: Optional[str] = Query(None),
    sub_category_code: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
):
    """List Level 3 divisions"""
    
    query_conditions = []
    
    if category_code:
        query_conditions.append(ItemDivision.category_code == category_code.upper())
    if sub_category_code:
        query_conditions.append(ItemDivision.sub_category_code == sub_category_code.upper())
    if is_active is not None:
        query_conditions.append(ItemDivision.is_active == is_active)
    
    if query_conditions:
        items = await ItemDivision.find(*query_conditions).sort("sort_order").to_list()
    else:
        items = await ItemDivision.find_all().sort("sort_order").to_list()
    
    return [
        {
            "id": str(i.id),
            "level": 3,
            "code": i.division_code,
            "name": i.division_name,
            "description": i.description,
            "category_code": i.category_code,
            "category_name": i.category_name,
            "sub_category_code": i.sub_category_code,
            "sub_category_name": i.sub_category_name,
            "path": i.path,
            "path_name": i.path_name,
            "icon": i.icon,
            "color_code": i.color_code,
            "sort_order": i.sort_order,
            "is_active": i.is_active,
            "child_count": i.child_count,
        }
        for i in items
    ]


@router.post("/divisions", status_code=201)
async def create_division(data: ItemDivisionCreate):
    """Create a new Level 3 division"""
    
    # Validate parents
    cat = await ItemCategory.find_one(ItemCategory.category_code == data.category_code.upper())
    if not cat:
        raise HTTPException(status_code=400, detail=f"Category '{data.category_code}' not found")
    
    subcat = await ItemSubCategory.find_one(ItemSubCategory.sub_category_code == data.sub_category_code.upper())
    if not subcat:
        raise HTTPException(status_code=400, detail=f"Sub-category '{data.sub_category_code}' not found")
    
    existing = await ItemDivision.find_one(ItemDivision.division_code == data.division_code.upper())
    if existing:
        raise HTTPException(status_code=400, detail=f"Division '{data.division_code}' already exists")
    
    # Use insert() instead of save()
    item = await ItemDivision(
        division_code=data.division_code.upper(),
        division_name=data.division_name,
        description=data.description,
        category_code=cat.category_code,
        category_name=cat.category_name,
        sub_category_code=subcat.sub_category_code,
        sub_category_name=subcat.sub_category_name,
        path=build_path([cat.category_code, subcat.sub_category_code, data.division_code.upper()]),
        path_name=build_path_name([cat.category_name, subcat.sub_category_name, data.division_name]),
        has_color=data.has_color,
        has_size=data.has_size,
        has_fabric=data.has_fabric,
        icon=data.icon,
        color_code=data.color_code,
        sort_order=data.sort_order,
    ).insert()
    
    subcat.child_count = await ItemDivision.find(ItemDivision.sub_category_code == subcat.sub_category_code).count()
    await subcat.save()
    
    return {"message": "Division created", "code": item.division_code}


@router.put("/divisions/{code}")
async def update_division(code: str, data: ItemDivisionUpdate):
    item = await ItemDivision.find_one(ItemDivision.division_code == code.upper())
    if not item:
        raise HTTPException(status_code=404, detail=f"Division '{code}' not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    
    if data.division_name:
        item.path_name = build_path_name([item.category_name, item.sub_category_name, data.division_name])
    
    item.updated_at = datetime.utcnow()
    await item.save()
    
    return {"message": "Division updated", "code": item.division_code}


@router.delete("/divisions/{code}")
async def delete_division(code: str):
    item = await ItemDivision.find_one(ItemDivision.division_code == code.upper())
    if not item:
        raise HTTPException(status_code=404, detail=f"Division '{code}' not found")
    
    children = await ItemClass.find(ItemClass.division_code == code.upper()).count()
    if children > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete: {children} classes exist")
    
    item.is_active = False
    await item.save()
    
    return {"message": "Division deactivated", "code": code}


# ==================== LEVEL 4: CLASSES ====================

@router.get("/classes", response_model=List[dict])
async def list_classes(
    category_code: Optional[str] = Query(None),
    sub_category_code: Optional[str] = Query(None),
    division_code: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
):
    """List Level 4 classes"""
    
    query_conditions = []
    
    if category_code:
        query_conditions.append(ItemClass.category_code == category_code.upper())
    if sub_category_code:
        query_conditions.append(ItemClass.sub_category_code == sub_category_code.upper())
    if division_code:
        query_conditions.append(ItemClass.division_code == division_code.upper())
    if is_active is not None:
        query_conditions.append(ItemClass.is_active == is_active)
    
    if query_conditions:
        items = await ItemClass.find(*query_conditions).sort("sort_order").to_list()
    else:
        items = await ItemClass.find_all().sort("sort_order").to_list()
    
    return [
        {
            "id": str(i.id),
            "level": 4,
            "code": i.class_code,
            "name": i.class_name,
            "description": i.description,
            "category_code": i.category_code,
            "category_name": i.category_name,
            "sub_category_code": i.sub_category_code,
            "sub_category_name": i.sub_category_name,
            "division_code": i.division_code,
            "division_name": i.division_name,
            "path": i.path,
            "path_name": i.path_name,
            "hsn_code": i.hsn_code,
            "gst_rate": i.gst_rate,
            "icon": i.icon,
            "color_code": i.color_code,
            "sort_order": i.sort_order,
            "is_active": i.is_active,
            "child_count": i.child_count,
        }
        for i in items
    ]


@router.post("/classes", status_code=201)
async def create_class(data: ItemClassCreate):
    """Create a new Level 4 class"""
    
    cat = await ItemCategory.find_one(ItemCategory.category_code == data.category_code.upper())
    if not cat:
        raise HTTPException(status_code=400, detail=f"Category '{data.category_code}' not found")
    
    subcat = await ItemSubCategory.find_one(ItemSubCategory.sub_category_code == data.sub_category_code.upper())
    if not subcat:
        raise HTTPException(status_code=400, detail=f"Sub-category '{data.sub_category_code}' not found")
    
    div = await ItemDivision.find_one(ItemDivision.division_code == data.division_code.upper())
    if not div:
        raise HTTPException(status_code=400, detail=f"Division '{data.division_code}' not found")
    
    existing = await ItemClass.find_one(ItemClass.class_code == data.class_code.upper())
    if existing:
        raise HTTPException(status_code=400, detail=f"Class '{data.class_code}' already exists")
    
    # Use insert() instead of save()
    item = await ItemClass(
        class_code=data.class_code.upper(),
        class_name=data.class_name,
        description=data.description,
        category_code=cat.category_code,
        category_name=cat.category_name,
        sub_category_code=subcat.sub_category_code,
        sub_category_name=subcat.sub_category_name,
        division_code=div.division_code,
        division_name=div.division_name,
        path=build_path([cat.category_code, subcat.sub_category_code, div.division_code, data.class_code.upper()]),
        path_name=build_path_name([cat.category_name, subcat.sub_category_name, div.division_name, data.class_name]),
        has_color=data.has_color,
        has_size=data.has_size,
        has_fabric=data.has_fabric,
        hsn_code=data.hsn_code,
        gst_rate=data.gst_rate,
        icon=data.icon,
        color_code=data.color_code,
        sort_order=data.sort_order,
    ).insert()
    
    div.child_count = await ItemClass.find(ItemClass.division_code == div.division_code).count()
    await div.save()
    
    return {"message": "Class created", "code": item.class_code}


@router.put("/classes/{code}")
async def update_class(code: str, data: ItemClassUpdate):
    item = await ItemClass.find_one(ItemClass.class_code == code.upper())
    if not item:
        raise HTTPException(status_code=404, detail=f"Class '{code}' not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    
    if data.class_name:
        item.path_name = build_path_name([item.category_name, item.sub_category_name, item.division_name, data.class_name])
    
    item.updated_at = datetime.utcnow()
    await item.save()
    
    return {"message": "Class updated", "code": item.class_code}


@router.delete("/classes/{code}")
async def delete_class(code: str):
    item = await ItemClass.find_one(ItemClass.class_code == code.upper())
    if not item:
        raise HTTPException(status_code=404, detail=f"Class '{code}' not found")
    
    children = await ItemSubClass.find(ItemSubClass.class_code == code.upper()).count()
    if children > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete: {children} sub-classes exist")
    
    item.is_active = False
    await item.save()
    
    return {"message": "Class deactivated", "code": code}


# ==================== LEVEL 5: SUB-CLASSES ====================

@router.get("/sub-classes", response_model=List[dict])
async def list_sub_classes(
    category_code: Optional[str] = Query(None),
    sub_category_code: Optional[str] = Query(None),
    division_code: Optional[str] = Query(None),
    class_code: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
):
    """List Level 5 sub-classes"""
    
    query_conditions = []
    
    if category_code:
        query_conditions.append(ItemSubClass.category_code == category_code.upper())
    if sub_category_code:
        query_conditions.append(ItemSubClass.sub_category_code == sub_category_code.upper())
    if division_code:
        query_conditions.append(ItemSubClass.division_code == division_code.upper())
    if class_code:
        query_conditions.append(ItemSubClass.class_code == class_code.upper())
    if is_active is not None:
        query_conditions.append(ItemSubClass.is_active == is_active)
    
    if query_conditions:
        items = await ItemSubClass.find(*query_conditions).sort("sort_order").to_list()
    else:
        items = await ItemSubClass.find_all().sort("sort_order").to_list()
    
    return [
        {
            "id": str(i.id),
            "level": 5,
            "code": i.sub_class_code,
            "name": i.sub_class_name,
            "description": i.description,
            "category_code": i.category_code,
            "category_name": i.category_name,
            "sub_category_code": i.sub_category_code,
            "sub_category_name": i.sub_category_name,
            "division_code": i.division_code,
            "division_name": i.division_name,
            "class_code": i.class_code,
            "class_name": i.class_name,
            "path": i.path,
            "path_name": i.path_name,
            "item_type": getattr(i, 'item_type', 'FG'),
            "sku_prefix": f"{getattr(i, 'item_type', 'FG')}-{i.sub_class_code}",
            "hsn_code": i.hsn_code,
            "gst_rate": i.gst_rate,
            "icon": i.icon,
            "color_code": i.color_code,
            "sort_order": i.sort_order,
            "is_active": i.is_active,
            "item_count": i.item_count,
        }
        for i in items
    ]


@router.post("/sub-classes", status_code=201)
async def create_sub_class(data: ItemSubClassCreate):
    """Create a new Level 5 sub-class"""
    
    cat = await ItemCategory.find_one(ItemCategory.category_code == data.category_code.upper())
    if not cat:
        raise HTTPException(status_code=400, detail=f"Category '{data.category_code}' not found")
    
    subcat = await ItemSubCategory.find_one(ItemSubCategory.sub_category_code == data.sub_category_code.upper())
    if not subcat:
        raise HTTPException(status_code=400, detail=f"Sub-category '{data.sub_category_code}' not found")
    
    div = await ItemDivision.find_one(ItemDivision.division_code == data.division_code.upper())
    if not div:
        raise HTTPException(status_code=400, detail=f"Division '{data.division_code}' not found")
    
    cls = await ItemClass.find_one(ItemClass.class_code == data.class_code.upper())
    if not cls:
        raise HTTPException(status_code=400, detail=f"Class '{data.class_code}' not found")
    
    existing = await ItemSubClass.find_one(ItemSubClass.sub_class_code == data.sub_class_code.upper())
    if existing:
        raise HTTPException(status_code=400, detail=f"Sub-class '{data.sub_class_code}' already exists")
    
    # Get item_type from data or inherit from category
    item_type = getattr(data, 'item_type', None) or getattr(cat, 'item_type', 'FG')
    sku_prefix = f"{item_type}-{data.sub_class_code.upper()}"
    
    # Use insert() instead of save()
    item = await ItemSubClass(
        sub_class_code=data.sub_class_code.upper(),
        sub_class_name=data.sub_class_name,
        description=data.description,
        category_code=cat.category_code,
        category_name=cat.category_name,
        sub_category_code=subcat.sub_category_code,
        sub_category_name=subcat.sub_category_name,
        division_code=div.division_code,
        division_name=div.division_name,
        class_code=cls.class_code,
        class_name=cls.class_name,
        path=build_path([cat.category_code, subcat.sub_category_code, div.division_code, cls.class_code, data.sub_class_code.upper()]),
        path_name=build_path_name([cat.category_name, subcat.sub_category_name, div.division_name, cls.class_name, data.sub_class_name]),
        item_type=item_type,
        sku_prefix=sku_prefix,
        has_color=data.has_color,
        has_size=data.has_size,
        has_fabric=data.has_fabric,
        hsn_code=data.hsn_code,
        gst_rate=data.gst_rate,
        icon=data.icon,
        color_code=data.color_code,
        sort_order=data.sort_order,
    ).insert()
    
    cls.child_count = await ItemSubClass.find(ItemSubClass.class_code == cls.class_code).count()
    await cls.save()
    
    return {"message": "Sub-class created", "code": item.sub_class_code}


@router.put("/sub-classes/{code}")
async def update_sub_class(code: str, data: ItemSubClassUpdate):
    item = await ItemSubClass.find_one(ItemSubClass.sub_class_code == code.upper())
    if not item:
        raise HTTPException(status_code=404, detail=f"Sub-class '{code}' not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    
    if data.sub_class_name:
        item.path_name = build_path_name([item.category_name, item.sub_category_name, item.division_name, item.class_name, data.sub_class_name])
    
    item.updated_at = datetime.utcnow()
    await item.save()
    
    return {"message": "Sub-class updated", "code": item.sub_class_code}


@router.delete("/sub-classes/{code}")
async def delete_sub_class(code: str):
    item = await ItemSubClass.find_one(ItemSubClass.sub_class_code == code.upper())
    if not item:
        raise HTTPException(status_code=404, detail=f"Sub-class '{code}' not found")
    
    item.is_active = False
    await item.save()
    
    return {"message": "Sub-class deactivated", "code": code}


# ==================== TREE VIEW ====================

@router.get("/tree")
async def get_hierarchy_tree(is_active: Optional[bool] = True):
    """Get full hierarchy as nested tree structure"""
    
    # Build base query for categories
    if is_active is not None:
        categories = await ItemCategory.find(
            ItemCategory.is_active == is_active
        ).sort("sort_order").to_list()
    else:
        categories = await ItemCategory.find_all().sort("sort_order").to_list()
    
    tree = []
    for cat in categories:
        cat_node = {
            "level": 1,
            "code": cat.category_code,
            "name": cat.category_name,
            "path": cat.category_code,
            "icon": cat.icon,
            "color_code": cat.color_code,
            "is_active": cat.is_active,
            "child_count": cat.child_count,
            "children": []
        }
        
        # Get sub-categories
        if is_active is not None:
            sub_cats = await ItemSubCategory.find(
                ItemSubCategory.category_code == cat.category_code,
                ItemSubCategory.is_active == is_active
            ).sort("sort_order").to_list()
        else:
            sub_cats = await ItemSubCategory.find(
                ItemSubCategory.category_code == cat.category_code
            ).sort("sort_order").to_list()
        
        for subcat in sub_cats:
            subcat_node = {
                "level": 2,
                "code": subcat.sub_category_code,
                "name": subcat.sub_category_name,
                "path": subcat.path,
                "icon": subcat.icon,
                "color_code": subcat.color_code,
                "is_active": subcat.is_active,
                "child_count": subcat.child_count,
                "children": []
            }
            
            # Get divisions
            if is_active is not None:
                divisions = await ItemDivision.find(
                    ItemDivision.sub_category_code == subcat.sub_category_code,
                    ItemDivision.is_active == is_active
                ).sort("sort_order").to_list()
            else:
                divisions = await ItemDivision.find(
                    ItemDivision.sub_category_code == subcat.sub_category_code
                ).sort("sort_order").to_list()
            
            for div in divisions:
                div_node = {
                    "level": 3,
                    "code": div.division_code,
                    "name": div.division_name,
                    "path": div.path,
                    "icon": div.icon,
                    "color_code": div.color_code,
                    "is_active": div.is_active,
                    "child_count": div.child_count,
                    "children": []
                }
                
                # Get classes
                if is_active is not None:
                    classes = await ItemClass.find(
                        ItemClass.division_code == div.division_code,
                        ItemClass.is_active == is_active
                    ).sort("sort_order").to_list()
                else:
                    classes = await ItemClass.find(
                        ItemClass.division_code == div.division_code
                    ).sort("sort_order").to_list()
                
                for cls in classes:
                    cls_node = {
                        "level": 4,
                        "code": cls.class_code,
                        "name": cls.class_name,
                        "path": cls.path,
                        "icon": cls.icon,
                        "color_code": cls.color_code,
                        "is_active": cls.is_active,
                        "child_count": cls.child_count,
                        "children": []
                    }
                    
                    # Get sub-classes
                    if is_active is not None:
                        sub_classes = await ItemSubClass.find(
                            ItemSubClass.class_code == cls.class_code,
                            ItemSubClass.is_active == is_active
                        ).sort("sort_order").to_list()
                    else:
                        sub_classes = await ItemSubClass.find(
                            ItemSubClass.class_code == cls.class_code
                        ).sort("sort_order").to_list()
                    
                    for subcls in sub_classes:
                        item_type = getattr(subcls, 'item_type', 'FG')
                        cls_node["children"].append({
                            "level": 5,
                            "code": subcls.sub_class_code,
                            "name": subcls.sub_class_name,
                            "path": subcls.path,
                            "icon": subcls.icon,
                            "color_code": subcls.color_code,
                            "is_active": subcls.is_active,
                            "item_type": item_type,
                            "sku_prefix": f"{item_type}-{subcls.sub_class_code}",
                            "item_count": subcls.item_count,
                            "children": []
                        })
                    
                    div_node["children"].append(cls_node)
                
                subcat_node["children"].append(div_node)
            
            cat_node["children"].append(subcat_node)
        
        tree.append(cat_node)
    
    return tree


# ==================== DROPDOWN HELPERS ====================

@router.get("/dropdown/{level}")
async def get_dropdown_options(
    level: int,
    category_code: Optional[str] = Query(None),
    sub_category_code: Optional[str] = Query(None),
    division_code: Optional[str] = Query(None),
    class_code: Optional[str] = Query(None),
):
    """Get dropdown options for a specific level, filtered by parent"""
    
    if level == 1:
        items = await ItemCategory.find(ItemCategory.is_active == True).sort("sort_order").to_list()
        return [{"value": i.category_code, "label": i.category_name, "color": i.color_code} for i in items]
    
    elif level == 2:
        if category_code:
            items = await ItemSubCategory.find(
                ItemSubCategory.category_code == category_code.upper(),
                ItemSubCategory.is_active == True
            ).sort("sort_order").to_list()
        else:
            items = await ItemSubCategory.find(ItemSubCategory.is_active == True).sort("sort_order").to_list()
        return [{"value": i.sub_category_code, "label": i.sub_category_name, "color": i.color_code} for i in items]
    
    elif level == 3:
        if sub_category_code:
            items = await ItemDivision.find(
                ItemDivision.sub_category_code == sub_category_code.upper(),
                ItemDivision.is_active == True
            ).sort("sort_order").to_list()
        else:
            items = await ItemDivision.find(ItemDivision.is_active == True).sort("sort_order").to_list()
        return [{"value": i.division_code, "label": i.division_name, "color": i.color_code} for i in items]
    
    elif level == 4:
        if division_code:
            items = await ItemClass.find(
                ItemClass.division_code == division_code.upper(),
                ItemClass.is_active == True
            ).sort("sort_order").to_list()
        else:
            items = await ItemClass.find(ItemClass.is_active == True).sort("sort_order").to_list()
        return [{"value": i.class_code, "label": i.class_name, "color": i.color_code} for i in items]
    
    elif level == 5:
        if class_code:
            items = await ItemSubClass.find(
                ItemSubClass.class_code == class_code.upper(),
                ItemSubClass.is_active == True
            ).sort("sort_order").to_list()
        else:
            items = await ItemSubClass.find(ItemSubClass.is_active == True).sort("sort_order").to_list()
        return [{"value": i.sub_class_code, "label": i.sub_class_name, "color": i.color_code} for i in items]
    
    return []


# ==================== SEED DATA ====================

@router.post("/seed")
async def seed_hierarchy():
    """Seed sample hierarchy data"""
    
    created = {"categories": 0, "sub_categories": 0, "divisions": 0, "classes": 0, "sub_classes": 0}
    
    # Seed categories
    for data in SEED_CATEGORIES:
        existing = await ItemCategory.find_one(ItemCategory.category_code == data["category_code"])
        if not existing:
            await ItemCategory(**data).insert()
            created["categories"] += 1
    
    # Seed sub-categories
    for data in SEED_SUB_CATEGORIES:
        existing = await ItemSubCategory.find_one(ItemSubCategory.sub_category_code == data["sub_category_code"])
        if not existing:
            cat = await ItemCategory.find_one(ItemCategory.category_code == data["category_code"])
            if cat:
                await ItemSubCategory(
                    sub_category_code=data["sub_category_code"],
                    sub_category_name=data["sub_category_name"],
                    description=data.get("description"),
                    category_code=cat.category_code,
                    category_name=cat.category_name,
                    path=build_path([cat.category_code, data["sub_category_code"]]),
                    path_name=build_path_name([cat.category_name, data["sub_category_name"]]),
                    icon=data.get("icon", "Users"),
                    color_code=data.get("color_code", "#3b82f6"),
                    sort_order=data.get("sort_order", 0),
                ).insert()
                created["sub_categories"] += 1
    
    # Seed divisions
    for data in SEED_DIVISIONS:
        existing = await ItemDivision.find_one(ItemDivision.division_code == data["division_code"])
        if not existing:
            cat = await ItemCategory.find_one(ItemCategory.category_code == data["category_code"])
            subcat = await ItemSubCategory.find_one(ItemSubCategory.sub_category_code == data["sub_category_code"])
            if cat and subcat:
                await ItemDivision(
                    division_code=data["division_code"],
                    division_name=data["division_name"],
                    description=data.get("description"),
                    category_code=cat.category_code,
                    category_name=cat.category_name,
                    sub_category_code=subcat.sub_category_code,
                    sub_category_name=subcat.sub_category_name,
                    path=build_path([cat.category_code, subcat.sub_category_code, data["division_code"]]),
                    path_name=build_path_name([cat.category_name, subcat.sub_category_name, data["division_name"]]),
                    icon=data.get("icon", "Layers"),
                    color_code=data.get("color_code", "#8b5cf6"),
                    sort_order=data.get("sort_order", 0),
                ).insert()
                created["divisions"] += 1
    
    # Seed classes
    for data in SEED_CLASSES:
        existing = await ItemClass.find_one(ItemClass.class_code == data["class_code"])
        if not existing:
            cat = await ItemCategory.find_one(ItemCategory.category_code == data["category_code"])
            subcat = await ItemSubCategory.find_one(ItemSubCategory.sub_category_code == data["sub_category_code"])
            div = await ItemDivision.find_one(ItemDivision.division_code == data["division_code"])
            if cat and subcat and div:
                await ItemClass(
                    class_code=data["class_code"],
                    class_name=data["class_name"],
                    description=data.get("description"),
                    category_code=cat.category_code,
                    category_name=cat.category_name,
                    sub_category_code=subcat.sub_category_code,
                    sub_category_name=subcat.sub_category_name,
                    division_code=div.division_code,
                    division_name=div.division_name,
                    path=build_path([cat.category_code, subcat.sub_category_code, div.division_code, data["class_code"]]),
                    path_name=build_path_name([cat.category_name, subcat.sub_category_name, div.division_name, data["class_name"]]),
                    icon=data.get("icon", "Tag"),
                    color_code=data.get("color_code", "#ec4899"),
                    sort_order=data.get("sort_order", 0),
                ).insert()
                created["classes"] += 1
    
    # Seed sub-classes
    for data in SEED_SUB_CLASSES:
        existing = await ItemSubClass.find_one(ItemSubClass.sub_class_code == data["sub_class_code"])
        if not existing:
            cat = await ItemCategory.find_one(ItemCategory.category_code == data["category_code"])
            subcat = await ItemSubCategory.find_one(ItemSubCategory.sub_category_code == data["sub_category_code"])
            div = await ItemDivision.find_one(ItemDivision.division_code == data["division_code"])
            cls = await ItemClass.find_one(ItemClass.class_code == data["class_code"])
            if cat and subcat and div and cls:
                await ItemSubClass(
                    sub_class_code=data["sub_class_code"],
                    sub_class_name=data["sub_class_name"],
                    description=data.get("description"),
                    category_code=cat.category_code,
                    category_name=cat.category_name,
                    sub_category_code=subcat.sub_category_code,
                    sub_category_name=subcat.sub_category_name,
                    division_code=div.division_code,
                    division_name=div.division_name,
                    class_code=cls.class_code,
                    class_name=cls.class_name,
                    path=build_path([cat.category_code, subcat.sub_category_code, div.division_code, cls.class_code, data["sub_class_code"]]),
                    path_name=build_path_name([cat.category_name, subcat.sub_category_name, div.division_name, cls.class_name, data["sub_class_name"]]),
                    icon=data.get("icon", "Hash"),
                    color_code=data.get("color_code", "#f59e0b"),
                    sort_order=data.get("sort_order", 0),
                ).insert()
                created["sub_classes"] += 1
    
    # Update child counts
    for cat in await ItemCategory.find_all().to_list():
        cat.child_count = await ItemSubCategory.find(ItemSubCategory.category_code == cat.category_code).count()
        await cat.save()
    
    for subcat in await ItemSubCategory.find_all().to_list():
        subcat.child_count = await ItemDivision.find(ItemDivision.sub_category_code == subcat.sub_category_code).count()
        await subcat.save()
    
    for div in await ItemDivision.find_all().to_list():
        div.child_count = await ItemClass.find(ItemClass.division_code == div.division_code).count()
        await div.save()
    
    for cls in await ItemClass.find_all().to_list():
        cls.child_count = await ItemSubClass.find(ItemSubClass.class_code == cls.class_code).count()
        await cls.save()
    
    return {"message": "Hierarchy seeded", "created": created}
