from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from ..models.supplier import Supplier, BankDetails
from ..core.dependencies import get_current_user

router = APIRouter()


class BankDetailsSchema(BaseModel):
    bank_name: str
    account_number: str
    ifsc_code: str
    account_type: str


class AddressSchema(BaseModel):
    line1: str
    line2: Optional[str] = None
    city: str
    state: str
    pincode: str
    country: str = "India"


class SupplierCreate(BaseModel):
    code: str
    company_name: str
    contact_person: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: str
    alternate_phone: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    address: AddressSchema
    bank_details: Optional[BankDetailsSchema] = None
    payment_terms: int = 30
    credit_limit: float = 0
    notes: Optional[str] = None


class SupplierUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    address: Optional[AddressSchema] = None
    bank_details: Optional[BankDetailsSchema] = None
    payment_terms: Optional[int] = None
    credit_limit: Optional[float] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/")
async def list_suppliers(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user = Depends(get_current_user),
):
    """List suppliers with pagination and search"""
    query = {}
    if is_active is not None:
        query["is_active"] = is_active
    if search:
        query["$or"] = [
            {"company_name": {"$regex": search, "$options": "i"}},
            {"code": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
        ]
    
    suppliers = await Supplier.find(query).skip(skip).limit(limit).to_list()
    total = await Supplier.find(query).count()
    
    return {
        "data": suppliers,
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("/")
async def create_supplier(
    data: SupplierCreate,
    current_user = Depends(get_current_user),
):
    """Create new supplier"""
    existing = await Supplier.find_one(Supplier.code == data.code)
    if existing:
        raise HTTPException(status_code=400, detail="Supplier code already exists")
    
    supplier = Supplier(
        code=data.code,
        company_name=data.company_name,
        contact_person=data.contact_person,
        email=data.email,
        phone=data.phone,
        alternate_phone=data.alternate_phone,
        gst_number=data.gst_number,
        pan_number=data.pan_number,
        address=Address(**data.address.dict()),
        bank_details=BankDetails(**data.bank_details.dict()) if data.bank_details else None,
        payment_terms=data.payment_terms,
        credit_limit=data.credit_limit,
        notes=data.notes,
    )
    
    await supplier.insert()
    return supplier


@router.get("/{supplier_id}")
async def get_supplier(
    supplier_id: str,
    current_user = Depends(get_current_user),
):
    """Get supplier details"""
    supplier = await Supplier.get(supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier


@router.put("/{supplier_id}")
async def update_supplier(
    supplier_id: str,
    data: SupplierUpdate,
    current_user = Depends(get_current_user),
):
    """Update supplier"""
    supplier = await Supplier.get(supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    update_data = data.dict(exclude_unset=True)
    
    if "address" in update_data and update_data["address"]:
        update_data["address"] = Address(**update_data["address"].dict())
    
    if "bank_details" in update_data and update_data["bank_details"]:
        update_data["bank_details"] = BankDetails(**update_data["bank_details"].dict())
    
    update_data["updated_at"] = datetime.utcnow()
    
    await supplier.set(update_data)
    return supplier


@router.delete("/{supplier_id}")
async def delete_supplier(
    supplier_id: str,
    current_user = Depends(get_current_user),
):
    """Soft delete supplier"""
    supplier = await Supplier.get(supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    supplier.is_active = False
    supplier.updated_at = datetime.utcnow()
    await supplier.save()
    
    return {"message": "Supplier deleted"}
