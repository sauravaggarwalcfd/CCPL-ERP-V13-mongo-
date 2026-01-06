"""
Brand Master API Routes
CRUD operations for brand management
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from datetime import datetime
import logging

from ..models.brand_master import (
    BrandMaster,
    BrandMasterCreate,
    BrandMasterUpdate,
    BrandMasterResponse,
    BrandGroup,
    BrandGroupCreate,
    BrandGroupUpdate,
    BrandGroupResponse
)
from ..core.dependencies import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


# ==================== BRAND GROUPS ====================

@router.get("/groups/", response_model=List[dict])
async def list_brand_groups(
    is_active: Optional[bool] = Query(None),
    current_user = Depends(get_current_user)
):
    """List all brand groups"""
    query = {BrandGroup.deleted_at: None}

    if is_active is not None:
        query[BrandGroup.is_active] = is_active

    groups = await BrandGroup.find(query).sort("+group_name").to_list()

    return [
        {
            "id": str(group.id),
            "group_code": group.group_code,
            "group_name": group.group_name,
            "description": group.description,
            "is_active": group.is_active,
            "created_at": group.created_at,
            "updated_at": group.updated_at
        }
        for group in groups
    ]


@router.get("/groups/{group_code}")
async def get_brand_group(
    group_code: str,
    current_user = Depends(get_current_user)
):
    """Get a single brand group by code"""
    group = await BrandGroup.find_one(
        BrandGroup.group_code == group_code,
        BrandGroup.deleted_at == None
    )

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brand group with code '{group_code}' not found"
        )

    return {
        "id": str(group.id),
        "group_code": group.group_code,
        "group_name": group.group_name,
        "description": group.description,
        "is_active": group.is_active,
        "created_at": group.created_at,
        "updated_at": group.updated_at
    }


@router.post("/groups/", status_code=status.HTTP_201_CREATED)
async def create_brand_group(
    data: BrandGroupCreate,
    current_user = Depends(get_current_user)
):
    """Create a new brand group"""
    # Check if group code already exists
    existing = await BrandGroup.find_one(
        BrandGroup.group_code == data.group_code,
        BrandGroup.deleted_at == None
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Brand group with code '{data.group_code}' already exists"
        )

    group = await BrandGroup(
        **data.model_dump()
    ).insert()

    logger.info(f"Created Brand Group: {data.group_code} - {data.group_name}")

    return {
        "id": str(group.id),
        "group_code": group.group_code,
        "group_name": group.group_name,
        "message": "Brand group created successfully"
    }


@router.put("/groups/{group_code}")
async def update_brand_group(
    group_code: str,
    data: BrandGroupUpdate,
    current_user = Depends(get_current_user)
):
    """Update a brand group"""
    group = await BrandGroup.find_one(
        BrandGroup.group_code == group_code,
        BrandGroup.deleted_at == None
    )

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brand group with code '{group_code}' not found"
        )

    update_data = data.model_dump(exclude_unset=True)
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        for field, value in update_data.items():
            setattr(group, field, value)
        await group.save()

    logger.info(f"Updated Brand Group: {group_code}")

    return {
        "id": str(group.id),
        "group_code": group.group_code,
        "group_name": group.group_name,
        "message": "Brand group updated successfully"
    }


@router.delete("/groups/{group_code}")
async def delete_brand_group(
    group_code: str,
    current_user = Depends(get_current_user)
):
    """Soft delete a brand group"""
    group = await BrandGroup.find_one(
        BrandGroup.group_code == group_code,
        BrandGroup.deleted_at == None
    )

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brand group with code '{group_code}' not found"
        )

    group.deleted_at = datetime.utcnow()
    group.is_active = False
    await group.save()

    logger.info(f"Deleted Brand Group: {group_code}")

    return {
        "message": f"Brand group '{group_code}' deleted successfully"
    }


@router.get("/groups/dropdown/")
async def get_brand_groups_dropdown(
    current_user = Depends(get_current_user)
):
    """Get brand groups for dropdown (active only)"""
    groups = await BrandGroup.find(
        BrandGroup.is_active == True,
        BrandGroup.deleted_at == None
    ).sort("+group_name").to_list()

    return [
        {
            "value": group.group_code,
            "label": group.group_name
        }
        for group in groups
    ]


# ==================== BRANDS ====================

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_brand(
    data: BrandMasterCreate,
    current_user = Depends(get_current_user)
):
    """Create a new brand"""

    # Check if brand code already exists
    existing = await BrandMaster.find_one(
        BrandMaster.brand_code == data.brand_code,
        BrandMaster.deleted_at == None
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Brand with code '{data.brand_code}' already exists"
        )

    brand = await BrandMaster(
        **data.model_dump()
    ).insert()

    logger.info(f"Created Brand: {data.brand_code} - {data.brand_name}")

    return {
        "id": str(brand.id),
        "brand_code": brand.brand_code,
        "brand_name": brand.brand_name,
        "message": "Brand created successfully"
    }


@router.get("/", response_model=List[dict])
async def list_brands(
    search: Optional[str] = Query(None),
    brand_group: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user = Depends(get_current_user)
):
    """List all brands with optional search and filtering"""

    query = {BrandMaster.deleted_at: None}

    if is_active is not None:
        query[BrandMaster.is_active] = is_active

    if brand_group:
        # Search in both brand_groups array and legacy brand_group
        query["$or"] = [
            {"brand_groups": brand_group},
            {"brand_group": brand_group}
        ]

    if search:
        search_query = [
            {"brand_code": {"$regex": search, "$options": "i"}},
            {"brand_name": {"$regex": search, "$options": "i"}},
            {"brand_category": {"$regex": search, "$options": "i"}}
        ]
        if "$or" in query:
            # Combine with existing $or using $and
            query = {"$and": [{"$or": query["$or"]}, {"$or": search_query}, {BrandMaster.deleted_at: None}]}
            if is_active is not None:
                query["$and"].append({BrandMaster.is_active: is_active})
        else:
            query["$or"] = search_query

    brands = await BrandMaster.find(query).skip(skip).limit(limit).to_list()

    return [
        {
            "id": str(brand.id),
            "brand_code": brand.brand_code,
            "brand_name": brand.brand_name,
            "brand_groups": getattr(brand, 'brand_groups', []) or [],
            "brand_group": brand.brand_group,
            "brand_category": brand.brand_category,
            "country": brand.country,
            "contact_person": brand.contact_person,
            "email": brand.email,
            "phone": brand.phone,
            "website": brand.website,
            "is_active": brand.is_active,
            "created_at": brand.created_at,
            "updated_at": brand.updated_at
        }
        for brand in brands
    ]


@router.get("/{brand_code}")
async def get_brand(
    brand_code: str,
    current_user = Depends(get_current_user)
):
    """Get a single brand by code"""

    brand = await BrandMaster.find_one(
        BrandMaster.brand_code == brand_code,
        BrandMaster.deleted_at == None
    )

    if not brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brand with code '{brand_code}' not found"
        )

    return {
        "id": str(brand.id),
        "brand_code": brand.brand_code,
        "brand_name": brand.brand_name,
        "brand_groups": getattr(brand, 'brand_groups', []) or [],
        "brand_group": brand.brand_group,
        "brand_category": brand.brand_category,
        "country": brand.country,
        "contact_person": brand.contact_person,
        "email": brand.email,
        "phone": brand.phone,
        "website": brand.website,
        "is_active": brand.is_active,
        "created_at": brand.created_at,
        "updated_at": brand.updated_at
    }


@router.put("/{brand_code}")
async def update_brand(
    brand_code: str,
    data: BrandMasterUpdate,
    current_user = Depends(get_current_user)
):
    """Update a brand"""

    brand = await BrandMaster.find_one(
        BrandMaster.brand_code == brand_code,
        BrandMaster.deleted_at == None
    )

    if not brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brand with code '{brand_code}' not found"
        )

    update_data = data.model_dump(exclude_unset=True)
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        for field, value in update_data.items():
            setattr(brand, field, value)
        await brand.save()

    logger.info(f"Updated Brand: {brand_code}")

    return {
        "id": str(brand.id),
        "brand_code": brand.brand_code,
        "brand_name": brand.brand_name,
        "message": "Brand updated successfully"
    }


@router.delete("/{brand_code}")
async def delete_brand(
    brand_code: str,
    current_user = Depends(get_current_user)
):
    """Soft delete a brand"""

    brand = await BrandMaster.find_one(
        BrandMaster.brand_code == brand_code,
        BrandMaster.deleted_at == None
    )

    if not brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brand with code '{brand_code}' not found"
        )

    brand.deleted_at = datetime.utcnow()
    brand.is_active = False
    await brand.save()

    logger.info(f"Deleted Brand: {brand_code}")

    return {
        "message": f"Brand '{brand_code}' deleted successfully"
    }


@router.get("/dropdown/list")
async def get_brands_dropdown(
    current_user = Depends(get_current_user)
):
    """Get brands for dropdown (active only)"""

    brands = await BrandMaster.find(
        BrandMaster.is_active == True,
        BrandMaster.deleted_at == None
    ).sort("+brand_name").to_list()

    return [
        {
            "value": brand.brand_code,
            "label": brand.brand_name
        }
        for brand in brands
    ]
