"""
Purchase Request API Routes
PR management with workflow and conversion to PO
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional, List
from datetime import datetime, date
from bson import ObjectId
import logging

from ..models.purchase_request import (
    PurchaseRequest, PRStatus, PRPriority, PRLineItem,
    PurchaseRequestCreate, PurchaseRequestUpdate, PRApproval, PRRejection,
    PRLineItemCreate
)
from ..core.dependencies import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


# ==================== HELPER FUNCTIONS ====================

def get_user_info(current_user):
    """Extract user info from User object or dict"""
    # get_current_user() returns a User document (email/full_name)
    if hasattr(current_user, 'email'):
        username = getattr(current_user, 'email', None) or "system"
        full_name = getattr(current_user, 'full_name', None) or username
    elif isinstance(current_user, dict):
        username = current_user.get("email") or current_user.get("username") or "system"
        full_name = current_user.get("full_name", username)
    else:
        username = "system"
        full_name = "System"
    return username, full_name


async def generate_pr_number() -> str:
    """Generate unique PR number in format: PR-YYYY-MM-XXXX"""
    now = datetime.utcnow()
    year = now.year
    month = str(now.month).zfill(2)

    prefix = f"PR-{year}-{month}"
    last_pr = await PurchaseRequest.find(
        PurchaseRequest.pr_code.startswith(prefix)
    ).sort("-pr_code").limit(1).to_list()

    if last_pr:
        last_seq = int(last_pr[0].pr_code.split("-")[-1])
        new_seq = last_seq + 1
    else:
        new_seq = 1

    pr_number = f"{prefix}-{str(new_seq).zfill(4)}"

    # Verify uniqueness
    existing = await PurchaseRequest.find_one(PurchaseRequest.pr_code == pr_number)
    if existing:
        pr_number = f"{prefix}-{str(new_seq).zfill(4)}-{now.strftime('%H%M%S')}"

    return pr_number


# ==================== CRUD ENDPOINTS ====================

@router.get("/purchase-requests")
async def list_purchase_requests(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    requested_by: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """List all purchase requests with filters"""
    try:
        query = {"is_active": True}
        
        if status:
            query["status"] = status
        if priority:
            query["priority"] = priority
        if requested_by:
            query["requested_by"] = requested_by
        if from_date:
            query["pr_date"] = {"$gte": from_date}
        if to_date:
            if "pr_date" in query:
                query["pr_date"]["$lte"] = to_date
            else:
                query["pr_date"] = {"$lte": to_date}

        prs = await PurchaseRequest.find(query).skip(skip).limit(limit).sort("-created_at").to_list()
        
        # Filter by search term
        if search:
            search_lower = search.lower()
            prs = [
                pr for pr in prs 
                if search_lower in pr.pr_code.lower() 
                or (pr.requested_by_name and search_lower in pr.requested_by_name.lower())
                or (pr.purpose and search_lower in pr.purpose.lower())
            ]

        return [
            {
                "id": str(pr.id),
                "pr_code": pr.pr_code,
                "pr_date": pr.pr_date.isoformat() if pr.pr_date else None,
                "requested_by": pr.requested_by,
                "requested_by_name": pr.requested_by_name,
                "department": pr.department,
                "priority": pr.priority,
                "required_by_date": pr.required_by_date.isoformat() if pr.required_by_date else None,
                "purpose": pr.purpose,
                "total_items": pr.total_items,
                "total_quantity": pr.total_quantity,
                "estimated_total": pr.estimated_total,
                "status": pr.status,
                "created_at": pr.created_at.isoformat() if pr.created_at else None,
            }
            for pr in prs
        ]
    except Exception as e:
        logger.error(f"Error listing purchase requests: {e}")
        raise HTTPException(500, f"Error listing purchase requests: {str(e)}")


@router.get("/purchase-requests/{pr_code}")
async def get_purchase_request(
    pr_code: str,
    current_user: dict = Depends(get_current_user)
):
    """Get single purchase request by code"""
    try:
        pr = await PurchaseRequest.find_one(PurchaseRequest.pr_code == pr_code)
        if not pr:
            raise HTTPException(404, f"Purchase Request {pr_code} not found")

        return {
            "id": str(pr.id),
            "pr_code": pr.pr_code,
            "pr_date": pr.pr_date.isoformat() if pr.pr_date else None,
            "requested_by": pr.requested_by,
            "requested_by_name": pr.requested_by_name,
            "department": pr.department,
            "priority": pr.priority,
            "required_by_date": pr.required_by_date.isoformat() if pr.required_by_date else None,
            "purpose": pr.purpose,
            "justification": pr.justification,
            "items": [
                {
                    "line_number": item.line_number,
                    "item_code": item.item_code,
                    "item_name": item.item_name,
                    "item_description": item.item_description,
                    "item_category": item.item_category,
                    "quantity": item.quantity,
                    "unit": item.unit,
                    "estimated_unit_rate": item.estimated_unit_rate,
                    "estimated_amount": item.estimated_amount,
                    "required_date": item.required_date.isoformat() if item.required_date else None,
                    "suggested_supplier_code": item.suggested_supplier_code,
                    "suggested_supplier_name": item.suggested_supplier_name,
                    "suggested_brand_code": getattr(item, 'suggested_brand_code', None),
                    "suggested_brand_name": getattr(item, 'suggested_brand_name', None),
                    "notes": item.notes,
                    "is_approved": item.is_approved,
                    "approved_quantity": item.approved_quantity,
                    "rejection_reason": item.rejection_reason,
                }
                for item in pr.items
            ],
            "total_items": pr.total_items,
            "total_quantity": pr.total_quantity,
            "estimated_total": pr.estimated_total,
            "status": pr.status,
            "approved_by": pr.approved_by,
            "approved_by_name": pr.approved_by_name,
            "approved_date": pr.approved_date.isoformat() if pr.approved_date else None,
            "approval_notes": pr.approval_notes,
            "rejected_by": pr.rejected_by,
            "rejected_by_name": pr.rejected_by_name,
            "rejected_date": pr.rejected_date.isoformat() if pr.rejected_date else None,
            "rejection_reason": pr.rejection_reason,
            "converted_to_po": pr.converted_to_po,
            "converted_date": pr.converted_date.isoformat() if pr.converted_date else None,
            "notes": pr.notes,
            "created_at": pr.created_at.isoformat() if pr.created_at else None,
            "updated_at": pr.updated_at.isoformat() if pr.updated_at else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting purchase request: {e}")
        raise HTTPException(500, f"Error getting purchase request: {str(e)}")


@router.post("/purchase-requests", status_code=status.HTTP_201_CREATED)
async def create_purchase_request(
    pr_data: PurchaseRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create new purchase request"""
    try:
        # Generate PR number
        pr_code = await generate_pr_number()
        
        # Build line items
        line_items = []
        for idx, item in enumerate(pr_data.items, start=1):
            estimated_amount = None
            if item.estimated_unit_rate and item.quantity:
                estimated_amount = item.estimated_unit_rate * item.quantity
                
            line_items.append(PRLineItem(
                line_number=idx,
                item_code=item.item_code,
                item_name=item.item_name,
                item_description=item.item_description,
                item_category=item.item_category,
                quantity=item.quantity,
                unit=item.unit,
                estimated_unit_rate=item.estimated_unit_rate,
                estimated_amount=estimated_amount,
                required_date=item.required_date,
                suggested_supplier_code=item.suggested_supplier_code,
                suggested_supplier_name=item.suggested_supplier_name,
                suggested_brand_code=getattr(item, 'suggested_brand_code', None),
                suggested_brand_name=getattr(item, 'suggested_brand_name', None),
                notes=item.notes,
            ))

        # Get user info using helper
        username, full_name = get_user_info(current_user)
        
        # Create PR
        pr = PurchaseRequest(
            pr_code=pr_code,
            pr_date=pr_data.pr_date or date.today(),
            requested_by=username,
            requested_by_name=full_name,
            department=pr_data.department,
            priority=pr_data.priority,
            required_by_date=pr_data.required_by_date,
            purpose=pr_data.purpose,
            justification=pr_data.justification,
            items=line_items,
            notes=pr_data.notes,
            status=PRStatus.DRAFT,
            created_by=username,
        )
        
        # Calculate totals
        pr.calculate_totals()
        
        await pr.insert()
        logger.info(f"Created Purchase Request: {pr_code}")
        
        return {
            "success": True,
            "pr_code": pr_code,
            "message": f"Purchase Request {pr_code} created successfully"
        }
    except Exception as e:
        logger.error(f"Error creating purchase request: {e}")
        raise HTTPException(500, f"Error creating purchase request: {str(e)}")


@router.put("/purchase-requests/{pr_code}")
async def update_purchase_request(
    pr_code: str,
    pr_data: PurchaseRequestUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update purchase request (only DRAFT status)"""
    try:
        pr = await PurchaseRequest.find_one(PurchaseRequest.pr_code == pr_code)
        if not pr:
            raise HTTPException(404, f"Purchase Request {pr_code} not found")

        if pr.status != PRStatus.DRAFT:
            raise HTTPException(400, f"Can only update DRAFT purchase requests. Current status: {pr.status}")

        # Update fields
        if pr_data.department is not None:
            pr.department = pr_data.department
        if pr_data.priority is not None:
            pr.priority = pr_data.priority
        if pr_data.required_by_date is not None:
            pr.required_by_date = pr_data.required_by_date
        if pr_data.purpose is not None:
            pr.purpose = pr_data.purpose
        if pr_data.justification is not None:
            pr.justification = pr_data.justification
        if pr_data.notes is not None:
            pr.notes = pr_data.notes

        # Update items if provided
        if pr_data.items is not None:
            line_items = []
            for idx, item in enumerate(pr_data.items, start=1):
                estimated_amount = None
                if item.estimated_unit_rate and item.quantity:
                    estimated_amount = item.estimated_unit_rate * item.quantity
                    
                line_items.append(PRLineItem(
                    line_number=idx,
                    item_code=item.item_code,
                    item_name=item.item_name,
                    item_description=item.item_description,
                    item_category=item.item_category,
                    quantity=item.quantity,
                    unit=item.unit,
                    estimated_unit_rate=item.estimated_unit_rate,
                    estimated_amount=estimated_amount,
                    required_date=item.required_date,
                    suggested_supplier_code=item.suggested_supplier_code,
                    suggested_supplier_name=item.suggested_supplier_name,
                    suggested_brand_code=getattr(item, 'suggested_brand_code', None),
                    suggested_brand_name=getattr(item, 'suggested_brand_name', None),
                    notes=item.notes,
                ))
            pr.items = line_items
            pr.calculate_totals()

        pr.updated_at = datetime.utcnow()
        username, _ = get_user_info(current_user)
        pr.updated_by = username
        
        await pr.save()
        
        return {
            "success": True,
            "message": f"Purchase Request {pr_code} updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating purchase request: {e}")
        raise HTTPException(500, f"Error updating purchase request: {str(e)}")


@router.put("/purchase-requests/{pr_code}/submit")
async def submit_purchase_request(
    pr_code: str,
    current_user: dict = Depends(get_current_user)
):
    """Submit purchase request for approval"""
    try:
        pr = await PurchaseRequest.find_one(PurchaseRequest.pr_code == pr_code)
        if not pr:
            raise HTTPException(404, f"Purchase Request {pr_code} not found")

        if pr.status != PRStatus.DRAFT:
            raise HTTPException(400, f"Can only submit DRAFT purchase requests. Current status: {pr.status}")

        if not pr.items or len(pr.items) == 0:
            raise HTTPException(400, "Cannot submit empty purchase request")

        pr.status = PRStatus.SUBMITTED
        pr.updated_at = datetime.utcnow()
        username, _ = get_user_info(current_user)
        pr.updated_by = username
        
        await pr.save()
        
        return {
            "success": True,
            "message": f"Purchase Request {pr_code} submitted for approval"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting purchase request: {e}")
        raise HTTPException(500, f"Error submitting purchase request: {str(e)}")


@router.put("/purchase-requests/{pr_code}/approve")
async def approve_purchase_request(
    pr_code: str,
    approval_data: Optional[PRApproval] = None,
    current_user: dict = Depends(get_current_user)
):
    """Approve purchase request"""
    try:
        pr = await PurchaseRequest.find_one(PurchaseRequest.pr_code == pr_code)
        if not pr:
            raise HTTPException(404, f"Purchase Request {pr_code} not found")

        if pr.status != PRStatus.SUBMITTED:
            raise HTTPException(400, f"Can only approve SUBMITTED purchase requests. Current status: {pr.status}")

        username, full_name = get_user_info(current_user)
        pr.status = PRStatus.APPROVED
        pr.approved_by = username
        pr.approved_by_name = full_name
        pr.approved_date = datetime.utcnow()
        
        if approval_data:
            pr.approval_notes = approval_data.approval_notes
            
            # Update approved quantities if provided
            if approval_data.approved_items:
                for approved_item in approval_data.approved_items:
                    for item in pr.items:
                        if item.line_number == approved_item.get("line_number"):
                            item.is_approved = True
                            item.approved_quantity = approved_item.get("approved_quantity", item.quantity)
                            break
            else:
                # Approve all items with full quantity
                for item in pr.items:
                    item.is_approved = True
                    item.approved_quantity = item.quantity
        else:
            # Approve all items with full quantity
            for item in pr.items:
                item.is_approved = True
                item.approved_quantity = item.quantity

        pr.updated_at = datetime.utcnow()
        pr.updated_by = username
        
        await pr.save()
        
        return {
            "success": True,
            "message": f"Purchase Request {pr_code} approved"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving purchase request: {e}")
        raise HTTPException(500, f"Error approving purchase request: {str(e)}")


@router.put("/purchase-requests/{pr_code}/reject")
async def reject_purchase_request(
    pr_code: str,
    rejection_data: PRRejection,
    current_user: dict = Depends(get_current_user)
):
    """Reject purchase request"""
    try:
        pr = await PurchaseRequest.find_one(PurchaseRequest.pr_code == pr_code)
        if not pr:
            raise HTTPException(404, f"Purchase Request {pr_code} not found")

        if pr.status != PRStatus.SUBMITTED:
            raise HTTPException(400, f"Can only reject SUBMITTED purchase requests. Current status: {pr.status}")

        username, full_name = get_user_info(current_user)
        pr.status = PRStatus.REJECTED
        pr.rejected_by = username
        pr.rejected_by_name = full_name
        pr.rejected_date = datetime.utcnow()
        pr.rejection_reason = rejection_data.rejection_reason
        
        pr.updated_at = datetime.utcnow()
        pr.updated_by = username
        
        await pr.save()
        
        return {
            "success": True,
            "message": f"Purchase Request {pr_code} rejected"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting purchase request: {e}")
        raise HTTPException(500, f"Error rejecting purchase request: {str(e)}")


@router.delete("/purchase-requests/{pr_code}")
async def delete_purchase_request(
    pr_code: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete/Cancel purchase request"""
    try:
        pr = await PurchaseRequest.find_one(PurchaseRequest.pr_code == pr_code)
        if not pr:
            raise HTTPException(404, f"Purchase Request {pr_code} not found")

        if pr.status in [PRStatus.APPROVED, PRStatus.CONVERTED]:
            raise HTTPException(400, f"Cannot delete {pr.status} purchase requests")

        username, _ = get_user_info(current_user)
        pr.status = PRStatus.CANCELLED
        pr.is_active = False
        pr.updated_at = datetime.utcnow()
        pr.updated_by = username
        
        await pr.save()
        
        return {
            "success": True,
            "message": f"Purchase Request {pr_code} cancelled"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting purchase request: {e}")
        raise HTTPException(500, f"Error deleting purchase request: {str(e)}")


@router.get("/purchase-requests/stats/summary")
async def get_pr_stats(
    current_user: dict = Depends(get_current_user)
):
    """Get purchase request statistics"""
    try:
        total = await PurchaseRequest.find({"is_active": True}).count()
        draft = await PurchaseRequest.find({"status": PRStatus.DRAFT, "is_active": True}).count()
        submitted = await PurchaseRequest.find({"status": PRStatus.SUBMITTED, "is_active": True}).count()
        approved = await PurchaseRequest.find({"status": PRStatus.APPROVED, "is_active": True}).count()
        rejected = await PurchaseRequest.find({"status": PRStatus.REJECTED, "is_active": True}).count()
        converted = await PurchaseRequest.find({"status": PRStatus.CONVERTED, "is_active": True}).count()
        
        return {
            "total": total,
            "draft": draft,
            "submitted": submitted,
            "approved": approved,
            "rejected": rejected,
            "converted": converted,
            "pending_approval": submitted,
        }
    except Exception as e:
        logger.error(f"Error getting PR stats: {e}")
        raise HTTPException(500, f"Error getting PR stats: {str(e)}")
