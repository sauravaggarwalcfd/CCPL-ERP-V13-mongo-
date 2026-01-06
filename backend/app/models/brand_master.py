"""
Brand Master Model
Stores information about brands used/sold in the business
"""

from beanie import Document
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime


# ==================== BRAND GROUP ====================

class BrandGroup(Document):
    """Brand Group collection model"""

    group_code: str = Field(..., unique=True, index=True)
    group_name: str = Field(..., index=True)
    description: Optional[str] = None
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None

    class Settings:
        name = "brand_groups"
        indexes = ["group_code", "group_name", "is_active"]


class BrandGroupCreate(BaseModel):
    """Schema for creating a brand group"""
    group_code: str = Field(..., min_length=2, max_length=50)
    group_name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    is_active: bool = True


class BrandGroupUpdate(BaseModel):
    """Schema for updating a brand group"""
    group_name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class BrandGroupResponse(BaseModel):
    """Schema for brand group response"""
    id: str
    group_code: str
    group_name: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== BRAND MASTER ====================

class BrandMaster(Document):
    """Brand Master collection model"""

    brand_code: str = Field(..., unique=True, index=True)
    brand_name: str = Field(..., index=True)
    brand_groups: List[str] = Field(default_factory=list)  # Multiple groups
    brand_group: Optional[str] = None  # Legacy single group
    brand_category: Optional[str] = None  # Textile/Trim/Button/etc
    country: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None

    class Settings:
        name = "brand_master"
        indexes = [
            "brand_code",
            "brand_name",
            "brand_groups",
            "brand_group",
            "is_active",
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "brand_code": "BR-001",
                "brand_name": "ABC Threads",
                "brand_groups": ["PREMIUM_BRANDS", "TEXTILE_BRANDS"],
                "brand_category": "Textile",
                "country": "India",
                "contact_person": "John Doe",
                "email": "john@abc.com",
                "phone": "+91-9999999999",
                "website": "https://www.abc.com",
                "is_active": True
            }
        }


class BrandMasterCreate(BaseModel):
    """Schema for creating a brand"""
    brand_code: str = Field(..., min_length=2, max_length=20)
    brand_name: str = Field(..., min_length=2, max_length=200)
    brand_groups: List[str] = Field(default_factory=list)
    brand_group: Optional[str] = None  # Legacy
    brand_category: Optional[str] = None
    country: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    is_active: bool = True


class BrandMasterUpdate(BaseModel):
    """Schema for updating a brand"""
    brand_name: Optional[str] = None
    brand_groups: Optional[List[str]] = None
    brand_group: Optional[str] = None  # Legacy
    brand_category: Optional[str] = None
    country: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    is_active: Optional[bool] = None


class BrandMasterResponse(BaseModel):
    """Schema for brand response"""
    id: str
    brand_code: str
    brand_name: str
    brand_groups: List[str] = Field(default_factory=list)
    brand_group: Optional[str] = None  # Legacy
    brand_category: Optional[str] = None
    country: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
