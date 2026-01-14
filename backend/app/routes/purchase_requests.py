"""
Purchase Request API Routes
PR management with workflow and conversion to PO
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional, List
from datetime import datetime, date, timedelta
from bson import ObjectId
import logging
from collections import defaultdict

from ..models.purchase_request import (
    PurchaseRequest, PRStatus, PRPriority, PRLineItem,
    PurchaseRequestCreate, PurchaseRequestUpdate, PRApproval, PRRejection,
    PRLineItemCreate
)
from ..models.purchase_order import (
    PurchaseOrder, POStatus, POLineItem, POSupplierInfo,
    POSummary, PODelivery, POPayment, POApproval, POTracking
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
    # Use regex to find PRs starting with the prefix
    last_pr = await PurchaseRequest.find(
        {"pr_code": {"$regex": f"^{prefix}"}}
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


@router.post("/purchase-requests/validate")
async def validate_purchase_request(
    pr_data: PurchaseRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    """Validate purchase request data without creating"""
    try:
        logger.info(f"[VALIDATE] PR Data received: {pr_data}")
        logger.info(f"[VALIDATE] Items count: {len(pr_data.items)}")

        # Return validation success with parsed data
        return {
            "valid": True,
            "parsed_data": {
                "pr_date": str(pr_data.pr_date) if pr_data.pr_date else None,
                "department": pr_data.department,
                "priority": pr_data.priority,
                "required_by_date": str(pr_data.required_by_date) if pr_data.required_by_date else None,
                "purpose": pr_data.purpose,
                "justification": pr_data.justification,
                "items_count": len(pr_data.items),
                "first_item": {
                    "item_name": pr_data.items[0].item_name if pr_data.items else None,
                    "quantity": pr_data.items[0].quantity if pr_data.items else None,
                } if pr_data.items else None
            }
        }
    except Exception as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(400, f"Validation error: {str(e)}")


@router.post("/purchase-requests", status_code=status.HTTP_201_CREATED)
async def create_purchase_request(
    pr_data: PurchaseRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create new purchase request"""
    try:
        # Debug logging - log after successful parsing
        logger.info(f"[CREATE PR] Successfully parsed request body")
        logger.info(f"[CREATE PR] PR date: {pr_data.pr_date}, Priority: {pr_data.priority}")
        logger.info(f"[CREATE PR] Items count: {len(pr_data.items)}")
        if pr_data.items:
            logger.info(f"[CREATE PR] First item: {pr_data.items[0].item_name}, qty: {pr_data.items[0].quantity}")
        logger.info(f"[CREATE PR] Current user type: {type(current_user)}")

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
                category_path=item.category_path,
                category_code=item.category_code,
                sub_category_code=item.sub_category_code,
                division_code=item.division_code,
                class_code=item.class_code,
                sub_class_code=item.sub_class_code,
                quantity=item.quantity,
                unit=item.unit,
                estimated_unit_rate=item.estimated_unit_rate,
                estimated_amount=estimated_amount,
                required_date=item.required_date,
                colour_code=item.colour_code,
                size_code=item.size_code,
                uom_code=item.uom_code,
                specifications=item.specifications,
                suggested_supplier_code=item.suggested_supplier_code,
                suggested_supplier_name=item.suggested_supplier_name,
                suggested_brand_code=item.suggested_brand_code,
                suggested_brand_name=item.suggested_brand_name,
                notes=item.notes,
                is_new_item=item.is_new_item,
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
        import traceback
        logger.error(f"Error creating purchase request: {e}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
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
                    category_path=item.category_path,
                    category_code=item.category_code,
                    sub_category_code=item.sub_category_code,
                    division_code=item.division_code,
                    class_code=item.class_code,
                    sub_class_code=item.sub_class_code,
                    quantity=item.quantity,
                    unit=item.unit,
                    estimated_unit_rate=item.estimated_unit_rate,
                    estimated_amount=estimated_amount,
                    required_date=item.required_date,
                    colour_code=item.colour_code,
                    size_code=item.size_code,
                    uom_code=item.uom_code,
                    specifications=item.specifications,
                    suggested_supplier_code=item.suggested_supplier_code,
                    suggested_supplier_name=item.suggested_supplier_name,
                    suggested_brand_code=item.suggested_brand_code,
                    suggested_brand_name=item.suggested_brand_name,
                    notes=item.notes,
                    is_new_item=item.is_new_item,
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


# ==================== PR TO PO CONVERSION ====================

async def generate_po_number() -> str:
    """Generate unique PO number in format: PO-YYYY-MM-XXXX"""
    now = datetime.utcnow()
    year = now.year
    month = str(now.month).zfill(2)

    prefix = f"PO-{year}-{month}"
    # Use regex query instead of .startswith() which returns boolean in Beanie
    last_po = await PurchaseOrder.find(
        {"po_number": {"$regex": f"^{prefix}"}}
    ).sort("-po_number").limit(1).to_list()

    if last_po:
        last_seq = int(last_po[0].po_number.split("-")[-1])
        new_seq = last_seq + 1
    else:
        new_seq = 1

    po_number = f"{prefix}-{str(new_seq).zfill(4)}"

    # Verify uniqueness
    existing = await PurchaseOrder.find_one(PurchaseOrder.po_number == po_number)
    if existing:
        po_number = f"{prefix}-{str(new_seq).zfill(4)}-{now.strftime('%H%M%S')}"

    return po_number


@router.post("/purchase-requests/{pr_code}/convert-to-po")
async def convert_pr_to_po(
    pr_code: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Convert approved Purchase Request to Purchase Order(s).
    Groups items by supplier and creates separate POs for each supplier.
    Returns list of created PO numbers.
    """
    try:
        pr = await PurchaseRequest.find_one(PurchaseRequest.pr_code == pr_code)
        if not pr:
            raise HTTPException(404, f"Purchase Request {pr_code} not found")

        if pr.status != PRStatus.APPROVED:
            raise HTTPException(400, f"Can only convert APPROVED purchase requests. Current status: {pr.status}")

        if pr.converted_to_po:
            raise HTTPException(400, f"Purchase Request {pr_code} has already been converted to PO: {pr.converted_to_po}")

        username, full_name = get_user_info(current_user)

        # Group approved items by supplier
        supplier_items = defaultdict(list)
        for item in pr.items:
            if item.is_approved and item.approved_quantity > 0:
                supplier_code = item.suggested_supplier_code or "DEFAULT"
                supplier_name = item.suggested_supplier_name or "Default Supplier"
                supplier_items[(supplier_code, supplier_name)].append(item)

        if not supplier_items:
            raise HTTPException(400, "No approved items to convert to PO")

        created_pos = []

        # Create a PO for each supplier
        for (supplier_code, supplier_name), items in supplier_items.items():
            po_number = await generate_po_number()

            # Build PO line items
            po_items = []
            subtotal = 0

            for idx, pr_item in enumerate(items, start=1):
                quantity = pr_item.approved_quantity or pr_item.quantity
                unit_rate = pr_item.estimated_unit_rate or 0
                line_amount = round(quantity * unit_rate, 2)

                # Calculate GST (default 18%)
                gst_percent = 18.0
                cgst_percent = gst_percent / 2
                sgst_percent = gst_percent / 2
                taxable_amount = line_amount
                cgst_amount = round(taxable_amount * (cgst_percent / 100), 2)
                sgst_amount = round(taxable_amount * (sgst_percent / 100), 2)
                gst_amount = cgst_amount + sgst_amount
                net_amount = round(taxable_amount + gst_amount, 2)

                po_item = POLineItem(
                    line_number=idx,
                    item_code=pr_item.item_code,
                    item_name=pr_item.item_name,
                    item_description=pr_item.item_description,
                    item_category=pr_item.item_category,
                    quantity=quantity,
                    unit=pr_item.unit or "PCS",
                    unit_rate=unit_rate,
                    line_amount=line_amount,
                    discount_percent=0,
                    discount_amount=0,
                    taxable_amount=taxable_amount,
                    hsn_code="",
                    gst_percent=gst_percent,
                    cgst_percent=cgst_percent,
                    sgst_percent=sgst_percent,
                    igst_percent=0,
                    gst_amount=gst_amount,
                    cgst_amount=cgst_amount,
                    sgst_amount=sgst_amount,
                    igst_amount=0,
                    net_amount=net_amount,
                    expected_delivery_date=pr_item.required_date or pr.required_by_date,
                    notes=pr_item.notes,
                    received_quantity=0,
                    pending_quantity=quantity
                )
                po_items.append(po_item)
                subtotal += line_amount

            # Calculate summary
            total_cgst = sum(item.cgst_amount for item in po_items)
            total_sgst = sum(item.sgst_amount for item in po_items)
            total_gst = total_cgst + total_sgst
            grand_total = round(subtotal + total_gst, 2)

            po_summary = POSummary(
                subtotal=subtotal,
                total_discount=0,
                total_taxable=subtotal,
                total_cgst=total_cgst,
                total_sgst=total_sgst,
                total_igst=0,
                total_gst=total_gst,
                round_off=0,
                grand_total=grand_total
            )

            # Create supplier info
            supplier_info = POSupplierInfo(
                code=supplier_code,
                name=supplier_name,
                payment_method="BANK_TRANSFER",
                payment_terms="NET 30"
            )

            # Create delivery info
            delivery_info = PODelivery(
                location="Main Warehouse",
                method="COURIER",
                lead_time_days=15,
                expected_delivery_date=pr.required_by_date or (date.today() + timedelta(days=15))
            )

            # Create tracking info
            tracking_info = POTracking(
                created_by=username,
                created_date=datetime.utcnow()
            )

            # Create the PO
            po = PurchaseOrder(
                po_number=po_number,
                po_version=1,
                po_date=date.today(),
                po_status=POStatus.DRAFT,
                indent_number=pr_code,  # Link to PR
                supplier=supplier_info,
                items=po_items,
                summary=po_summary,
                delivery=delivery_info,
                payment=POPayment(),
                department=pr.department,
                remarks=f"Auto-generated from PR: {pr_code}. Purpose: {pr.purpose}",
                approval=POApproval(),
                tracking=tracking_info,
                is_active=True,
                is_deleted=False
            )

            await po.insert()
            created_pos.append(po_number)
            logger.info(f"Created PO {po_number} from PR {pr_code} for supplier {supplier_code}")

        # Update PR status to CONVERTED
        pr.status = PRStatus.CONVERTED
        pr.converted_to_po = ", ".join(created_pos)
        pr.converted_date = datetime.utcnow()
        pr.updated_at = datetime.utcnow()
        pr.updated_by = username

        await pr.save()

        return {
            "success": True,
            "message": f"Purchase Request {pr_code} converted to {len(created_pos)} Purchase Order(s)",
            "pr_code": pr_code,
            "po_numbers": created_pos,
            "redirect_to": f"/purchase-orders/{created_pos[0]}" if len(created_pos) == 1 else "/purchase-orders"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error converting PR to PO: {e}")
        raise HTTPException(500, f"Error converting PR to PO: {str(e)}")


@router.put("/purchase-requests/{pr_code}/mark-converted")
async def mark_pr_as_converted(
    pr_code: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Mark a PR as converted to PO after manual PO creation.
    Called from PO form when creating PO from PR data.
    """
    try:
        pr = await PurchaseRequest.find_one(PurchaseRequest.pr_code == pr_code)
        if not pr:
            raise HTTPException(404, f"Purchase Request {pr_code} not found")

        po_number = data.get("po_number")
        if not po_number:
            raise HTTPException(400, "PO number is required")

        # Update PR status
        pr.status = PRStatus.CONVERTED
        pr.converted_to_po = po_number
        pr.updated_at = datetime.utcnow()
        await pr.save()

        return {
            "success": True,
            "message": f"PR {pr_code} marked as converted to PO {po_number}",
            "pr_code": pr_code,
            "po_number": po_number
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking PR as converted: {e}")
        raise HTTPException(500, f"Error marking PR as converted: {str(e)}")


@router.get("/purchase-requests/{pr_code}/conversion-preview")
async def preview_pr_to_po_conversion(
    pr_code: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Preview what POs will be created from this PR.
    Shows grouping by supplier without actually creating POs.
    """
    try:
        pr = await PurchaseRequest.find_one(PurchaseRequest.pr_code == pr_code)
        if not pr:
            raise HTTPException(404, f"Purchase Request {pr_code} not found")

        if pr.status != PRStatus.APPROVED:
            raise HTTPException(400, f"Can only preview conversion for APPROVED purchase requests")

        # Group approved items by supplier
        supplier_items = defaultdict(list)
        for item in pr.items:
            if item.is_approved and item.approved_quantity > 0:
                supplier_code = item.suggested_supplier_code or "DEFAULT"
                supplier_name = item.suggested_supplier_name or "Default Supplier"
                supplier_items[(supplier_code, supplier_name)].append({
                    "item_code": item.item_code,
                    "item_name": item.item_name,
                    "quantity": item.approved_quantity or item.quantity,
                    "unit": item.unit,
                    "estimated_rate": item.estimated_unit_rate,
                    "estimated_amount": (item.approved_quantity or item.quantity) * (item.estimated_unit_rate or 0)
                })

        preview = []
        for (supplier_code, supplier_name), items in supplier_items.items():
            total = sum(item["estimated_amount"] for item in items)
            preview.append({
                "supplier_code": supplier_code,
                "supplier_name": supplier_name,
                "item_count": len(items),
                "items": items,
                "estimated_total": total
            })

        return {
            "pr_code": pr_code,
            "can_convert": len(preview) > 0,
            "po_count": len(preview),
            "preview": preview
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error previewing PR conversion: {e}")
        raise HTTPException(500, f"Error previewing PR conversion: {str(e)}")
