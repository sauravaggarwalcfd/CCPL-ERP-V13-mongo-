"""
Supplier Master API Routes
CRUD operations for supplier management
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from datetime import datetime
import logging

from ..models.supplier_master import (
    SupplierMaster,
    SupplierMasterCreate,
    SupplierMasterUpdate,
    SupplierMasterResponse,
    SupplierGroup,
    SupplierGroupCreate,
    SupplierGroupUpdate,
    SupplierGroupResponse
)
from ..core.dependencies import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


# ==================== SUPPLIER GROUPS ====================

@router.get("/groups/", response_model=List[dict])
async def list_supplier_groups(
    is_active: Optional[bool] = Query(None),
    current_user = Depends(get_current_user)
):
    """List all supplier groups"""
    query = {SupplierGroup.deleted_at: None}

    if is_active is not None:
        query[SupplierGroup.is_active] = is_active

    groups = await SupplierGroup.find(query).sort("+group_name").to_list()

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
async def get_supplier_group(
    group_code: str,
    current_user = Depends(get_current_user)
):
    """Get a single supplier group by code"""
    group = await SupplierGroup.find_one(
        SupplierGroup.group_code == group_code,
        SupplierGroup.deleted_at == None
    )

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Supplier group with code '{group_code}' not found"
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
async def create_supplier_group(
    data: SupplierGroupCreate,
    current_user = Depends(get_current_user)
):
    """Create a new supplier group"""
    # Check if group code already exists
    existing = await SupplierGroup.find_one(
        SupplierGroup.group_code == data.group_code,
        SupplierGroup.deleted_at == None
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Supplier group with code '{data.group_code}' already exists"
        )

    group = await SupplierGroup(
        **data.model_dump()
    ).insert()

    logger.info(f"Created Supplier Group: {data.group_code} - {data.group_name}")

    return {
        "id": str(group.id),
        "group_code": group.group_code,
        "group_name": group.group_name,
        "message": "Supplier group created successfully"
    }


@router.put("/groups/{group_code}")
async def update_supplier_group(
    group_code: str,
    data: SupplierGroupUpdate,
    current_user = Depends(get_current_user)
):
    """Update a supplier group"""
    group = await SupplierGroup.find_one(
        SupplierGroup.group_code == group_code,
        SupplierGroup.deleted_at == None
    )

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Supplier group with code '{group_code}' not found"
        )

    update_data = data.model_dump(exclude_unset=True)
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        for field, value in update_data.items():
            setattr(group, field, value)
        await group.save()

    logger.info(f"Updated Supplier Group: {group_code}")

    return {
        "id": str(group.id),
        "group_code": group.group_code,
        "group_name": group.group_name,
        "message": "Supplier group updated successfully"
    }


@router.delete("/groups/{group_code}")
async def delete_supplier_group(
    group_code: str,
    current_user = Depends(get_current_user)
):
    """Soft delete a supplier group"""
    group = await SupplierGroup.find_one(
        SupplierGroup.group_code == group_code,
        SupplierGroup.deleted_at == None
    )

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Supplier group with code '{group_code}' not found"
        )

    group.deleted_at = datetime.utcnow()
    group.is_active = False
    await group.save()

    logger.info(f"Deleted Supplier Group: {group_code}")

    return {
        "message": f"Supplier group '{group_code}' deleted successfully"
    }


@router.get("/groups/dropdown/")
async def get_supplier_groups_dropdown(
    current_user = Depends(get_current_user)
):
    """Get supplier groups for dropdown (active only)"""
    groups = await SupplierGroup.find(
        SupplierGroup.is_active == True,
        SupplierGroup.deleted_at == None
    ).sort("+group_name").to_list()

    return [
        {
            "value": group.group_code,
            "label": group.group_name
        }
        for group in groups
    ]


# ==================== SUPPLIERS ====================


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_supplier(
    data: SupplierMasterCreate,
    current_user = Depends(get_current_user)
):
    """Create a new supplier"""

    # Check if supplier code already exists
    existing = await SupplierMaster.find_one(
        SupplierMaster.supplier_code == data.supplier_code,
        SupplierMaster.deleted_at == None
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Supplier with code '{data.supplier_code}' already exists"
        )

    supplier = await SupplierMaster(
        **data.model_dump()
    ).insert()

    logger.info(f"Created Supplier: {data.supplier_code} - {data.supplier_name}")

    return {
        "id": str(supplier.id),
        "supplier_code": supplier.supplier_code,
        "supplier_name": supplier.supplier_name,
        "message": "Supplier created successfully"
    }


@router.get("/", response_model=List[dict])
async def list_suppliers(
    search: Optional[str] = Query(None),
    supplier_type: Optional[str] = Query(None),
    supplier_group: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user = Depends(get_current_user)
):
    """List all suppliers with optional search and filtering"""

    query = {SupplierMaster.deleted_at: None}

    if is_active is not None:
        query[SupplierMaster.is_active] = is_active

    if supplier_type:
        query[SupplierMaster.supplier_type] = supplier_type

    if supplier_group:
        # Search in both supplier_groups array and legacy supplier_group_code
        query["$or"] = [
            {"supplier_groups": supplier_group},
            {"supplier_group_code": supplier_group}
        ]

    if city:
        query[SupplierMaster.city] = {"$regex": city, "$options": "i"}

    if search:
        search_query = [
            {"supplier_code": {"$regex": search, "$options": "i"}},
            {"supplier_name": {"$regex": search, "$options": "i"}},
            {"contact_person": {"$regex": search, "$options": "i"}}
        ]
        if "$or" in query:
            # Combine with existing $or using $and
            query = {"$and": [{"$or": query["$or"]}, {"$or": search_query}, {SupplierMaster.deleted_at: None}]}
            if is_active is not None:
                query["$and"].append({SupplierMaster.is_active: is_active})
        else:
            query["$or"] = search_query

    suppliers = await SupplierMaster.find(query).skip(skip).limit(limit).to_list()

    return [
        {
            "id": str(supplier.id),
            "supplier_code": supplier.supplier_code,
            "supplier_name": supplier.supplier_name,
            "supplier_groups": getattr(supplier, 'supplier_groups', []) or [],
            "supplier_group_code": supplier.supplier_group_code,
            "supplier_type": supplier.supplier_type,
            "country": supplier.country,
            "city": supplier.city,
            "contact_person": supplier.contact_person,
            "email": supplier.email,
            "phone": supplier.phone,
            "website": supplier.website,
            "address": supplier.address,
            "gst_number": supplier.gst_number,
            "bank_account": supplier.bank_account,
            "payment_terms": supplier.payment_terms,
            "is_active": supplier.is_active,
            "created_at": supplier.created_at,
            "updated_at": supplier.updated_at
        }
        for supplier in suppliers
    ]


@router.get("/{supplier_code}")
async def get_supplier(
    supplier_code: str,
    current_user = Depends(get_current_user)
):
    """Get a single supplier by code"""

    supplier = await SupplierMaster.find_one(
        SupplierMaster.supplier_code == supplier_code,
        SupplierMaster.deleted_at == None
    )

    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Supplier with code '{supplier_code}' not found"
        )

    return {
        "id": str(supplier.id),
        "supplier_code": supplier.supplier_code,
        "supplier_name": supplier.supplier_name,
        "supplier_groups": getattr(supplier, 'supplier_groups', []) or [],
        "supplier_group_code": supplier.supplier_group_code,
        "supplier_type": supplier.supplier_type,
        "country": supplier.country,
        "city": supplier.city,
        "contact_person": supplier.contact_person,
        "email": supplier.email,
        "phone": supplier.phone,
        "website": supplier.website,
        "address": supplier.address,
        "gst_number": supplier.gst_number,
        "bank_account": supplier.bank_account,
        "payment_terms": supplier.payment_terms,
        "is_active": supplier.is_active,
        "created_at": supplier.created_at,
        "updated_at": supplier.updated_at
    }


@router.put("/{supplier_code}")
async def update_supplier(
    supplier_code: str,
    data: SupplierMasterUpdate,
    current_user = Depends(get_current_user)
):
    """Update a supplier"""

    supplier = await SupplierMaster.find_one(
        SupplierMaster.supplier_code == supplier_code,
        SupplierMaster.deleted_at == None
    )

    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Supplier with code '{supplier_code}' not found"
        )

    update_data = data.model_dump(exclude_unset=True)
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        for field, value in update_data.items():
            setattr(supplier, field, value)
        await supplier.save()

    logger.info(f"Updated Supplier: {supplier_code}")

    return {
        "id": str(supplier.id),
        "supplier_code": supplier.supplier_code,
        "supplier_name": supplier.supplier_name,
        "message": "Supplier updated successfully"
    }


@router.delete("/{supplier_code}")
async def delete_supplier(
    supplier_code: str,
    current_user = Depends(get_current_user)
):
    """Soft delete a supplier"""

    supplier = await SupplierMaster.find_one(
        SupplierMaster.supplier_code == supplier_code,
        SupplierMaster.deleted_at == None
    )

    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Supplier with code '{supplier_code}' not found"
        )

    supplier.deleted_at = datetime.utcnow()
    supplier.is_active = False
    await supplier.save()

    logger.info(f"Deleted Supplier: {supplier_code}")

    return {
        "message": f"Supplier '{supplier_code}' deleted successfully"
    }


@router.get("/dropdown/list")
async def get_suppliers_dropdown(
    current_user = Depends(get_current_user)
):
    """Get suppliers for dropdown (active only)"""

    suppliers = await SupplierMaster.find(
        SupplierMaster.is_active == True,
        SupplierMaster.deleted_at == None
    ).sort("+supplier_name").to_list()

    return [
        {
            "value": supplier.supplier_code,
            "label": supplier.supplier_name
        }
        for supplier in suppliers
    ]
