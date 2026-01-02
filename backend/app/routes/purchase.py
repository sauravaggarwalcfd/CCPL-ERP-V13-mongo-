"""
Purchase Management API Routes
- Purchase Orders (CRUD, Approve, Cancel)
- Goods Receipt (Create, Complete)
- Purchase Returns (Create, Approve)
- Vendor Bills (Create, Payment)
- Reports (Summary, Pending, Outstanding)
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional, List
from datetime import datetime
import logging

from ..models.purchase import (
    PurchaseOrder, POStatus,
    GoodsReceipt, GRStatus,
    PurchaseReturn, ReturnStatus,
    VendorBill, BillStatus,
    PurchaseOrderCreate, GoodsReceiptCreate, PurchaseReturnCreate, VendorBillCreate, PaymentCreate
)
from ..models.inventory_management import InventoryStock, StockMovement, MovementType
from ..core.dependencies import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

async def generate_po_code():
    """Generate next PO code"""
    today = datetime.utcnow().strftime("%Y%m%d")
    count = await PurchaseOrder.find(
        PurchaseOrder.po_code.startswith(f"PO-{today}")
    ).count()
    return f"PO-{today}-{str(count + 1).zfill(4)}"


async def generate_gr_code():
    """Generate next GR code"""
    today = datetime.utcnow().strftime("%Y%m%d")
    count = await GoodsReceipt.find(
        GoodsReceipt.gr_code.startswith(f"GR-{today}")
    ).count()
    return f"GR-{today}-{str(count + 1).zfill(4)}"


async def generate_pr_code():
    """Generate next PR code"""
    today = datetime.utcnow().strftime("%Y%m%d")
    count = await PurchaseReturn.find(
        PurchaseReturn.pr_code.startswith(f"PR-{today}")
    ).count()
    return f"PR-{today}-{str(count + 1).zfill(4)}"


async def generate_bill_code():
    """Generate next Bill code"""
    today = datetime.utcnow().strftime("%Y%m%d")
    count = await VendorBill.find(
        VendorBill.bill_code.startswith(f"BILL-{today}")
    ).count()
    return f"BILL-{today}-{str(count + 1).zfill(4)}"


# ═══════════════════════════════════════════════════════════════════════════
# PURCHASE ORDERS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/purchase-orders", status_code=status.HTTP_201_CREATED)
async def create_purchase_order(
    data: PurchaseOrderCreate,
    current_user=Depends(get_current_user)
):
    """Create new Purchase Order"""
    try:
        po_code = await generate_po_code()

        # Parse delivery date if provided
        delivery_date = None
        if data.delivery_date:
            try:
                delivery_date = datetime.fromisoformat(data.delivery_date.replace('Z', '+00:00'))
            except:
                delivery_date = datetime.strptime(data.delivery_date, "%Y-%m-%d")

        po = PurchaseOrder(
            po_code=po_code,
            vendor_code=data.vendor_code,
            vendor_name=data.vendor_name,
            delivery_date=delivery_date,
            line_items=data.line_items,
            subtotal=data.subtotal,
            tax_rate=data.tax_rate,
            tax_amount=data.tax_amount,
            discount_amount=data.discount_amount,
            total_amount=data.total_amount,
            shipping_address=data.shipping_address,
            notes=data.notes,
            terms_conditions=data.terms_conditions,
            created_by=str(current_user.id) if current_user else None
        )
        await po.save()

        logger.info(f"Created PO: {po_code}")
        return {"success": True, "po_code": po_code, "message": "Purchase Order created successfully"}

    except Exception as e:
        logger.error(f"Error creating PO: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/purchase-orders")
async def get_purchase_orders(
    status: Optional[str] = Query(None),
    vendor_code: Optional[str] = Query(None),
    skip: int = Query(0),
    limit: int = Query(50),
    current_user=Depends(get_current_user)
):
    """Get all Purchase Orders"""
    try:
        query_conditions = []

        if status:
            query_conditions.append(PurchaseOrder.status == status)
        if vendor_code:
            query_conditions.append(PurchaseOrder.vendor_code == vendor_code)

        if query_conditions:
            pos = await PurchaseOrder.find(*query_conditions).sort("-created_at").skip(skip).limit(limit).to_list()
        else:
            pos = await PurchaseOrder.find_all().sort("-created_at").skip(skip).limit(limit).to_list()

        return [
            {
                "id": str(po.id),
                "po_code": po.po_code,
                "vendor_code": po.vendor_code,
                "vendor_name": po.vendor_name,
                "po_date": po.po_date.isoformat() if po.po_date else None,
                "delivery_date": po.delivery_date.isoformat() if po.delivery_date else None,
                "status": po.status,
                "line_items": po.line_items,
                "subtotal": po.subtotal,
                "tax_amount": po.tax_amount,
                "total_amount": po.total_amount,
                "created_at": po.created_at.isoformat() if po.created_at else None,
            }
            for po in pos
        ]

    except Exception as e:
        logger.error(f"Error fetching POs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/purchase-orders/{po_code}")
async def get_purchase_order(
    po_code: str,
    current_user=Depends(get_current_user)
):
    """Get specific Purchase Order"""
    try:
        po = await PurchaseOrder.find_one(PurchaseOrder.po_code == po_code)
        if not po:
            raise HTTPException(status_code=404, detail="Purchase Order not found")

        return {
            "id": str(po.id),
            "po_code": po.po_code,
            "vendor_code": po.vendor_code,
            "vendor_name": po.vendor_name,
            "po_date": po.po_date.isoformat() if po.po_date else None,
            "delivery_date": po.delivery_date.isoformat() if po.delivery_date else None,
            "status": po.status,
            "line_items": po.line_items,
            "subtotal": po.subtotal,
            "tax_rate": po.tax_rate,
            "tax_amount": po.tax_amount,
            "discount_amount": po.discount_amount,
            "total_amount": po.total_amount,
            "shipping_address": po.shipping_address,
            "notes": po.notes,
            "terms_conditions": po.terms_conditions,
            "created_by": po.created_by,
            "approved_by": po.approved_by,
            "approved_at": po.approved_at.isoformat() if po.approved_at else None,
            "created_at": po.created_at.isoformat() if po.created_at else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching PO {po_code}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/purchase-orders/{po_code}/submit")
async def submit_po(
    po_code: str,
    current_user=Depends(get_current_user)
):
    """Submit Purchase Order for approval"""
    try:
        po = await PurchaseOrder.find_one(PurchaseOrder.po_code == po_code)
        if not po:
            raise HTTPException(status_code=404, detail="Purchase Order not found")

        if po.status != POStatus.DRAFT:
            raise HTTPException(status_code=400, detail="Only DRAFT POs can be submitted")

        po.status = POStatus.SUBMITTED
        po.updated_at = datetime.utcnow()
        await po.save()

        return {"success": True, "status": "SUBMITTED", "message": "PO submitted for approval"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting PO {po_code}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/purchase-orders/{po_code}/approve")
async def approve_po(
    po_code: str,
    current_user=Depends(get_current_user)
):
    """Approve Purchase Order"""
    try:
        po = await PurchaseOrder.find_one(PurchaseOrder.po_code == po_code)
        if not po:
            raise HTTPException(status_code=404, detail="Purchase Order not found")

        if po.status not in [POStatus.DRAFT, POStatus.SUBMITTED]:
            raise HTTPException(status_code=400, detail="Only DRAFT or SUBMITTED POs can be approved")

        po.status = POStatus.APPROVED
        po.approved_by = str(current_user.id) if current_user else None
        po.approved_at = datetime.utcnow()
        po.updated_at = datetime.utcnow()
        await po.save()

        return {"success": True, "status": "APPROVED", "message": "PO approved successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving PO {po_code}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/purchase-orders/{po_code}")
async def cancel_po(
    po_code: str,
    current_user=Depends(get_current_user)
):
    """Cancel Purchase Order"""
    try:
        po = await PurchaseOrder.find_one(PurchaseOrder.po_code == po_code)
        if not po:
            raise HTTPException(status_code=404, detail="Purchase Order not found")

        if po.status in [POStatus.FULLY_RECEIVED, POStatus.CLOSED]:
            raise HTTPException(status_code=400, detail="Cannot cancel a completed PO")

        po.status = POStatus.CANCELLED
        po.updated_at = datetime.utcnow()
        await po.save()

        return {"success": True, "message": "PO cancelled successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling PO {po_code}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════
# GOODS RECEIPT
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/goods-receipts", status_code=status.HTTP_201_CREATED)
async def create_goods_receipt(
    data: GoodsReceiptCreate,
    current_user=Depends(get_current_user)
):
    """Create Goods Receipt and update inventory"""
    try:
        gr_code = await generate_gr_code()

        # Parse invoice date if provided
        invoice_date = None
        if data.invoice_date:
            try:
                invoice_date = datetime.fromisoformat(data.invoice_date.replace('Z', '+00:00'))
            except:
                invoice_date = datetime.strptime(data.invoice_date, "%Y-%m-%d")

        gr = GoodsReceipt(
            gr_code=gr_code,
            po_code=data.po_code,
            vendor_code=data.vendor_code,
            vendor_name=data.vendor_name,
            received_items=data.received_items,
            invoice_number=data.invoice_number,
            invoice_date=invoice_date,
            warehouse_id=data.warehouse_id,
            warehouse_name=data.warehouse_name,
            quality_remarks=data.quality_remarks,
            received_by=str(current_user.id) if current_user else None,
            created_by=str(current_user.id) if current_user else None
        )
        await gr.save()

        # Update PO status
        po = await PurchaseOrder.find_one(PurchaseOrder.po_code == data.po_code)
        if po:
            po.status = POStatus.PARTIALLY_RECEIVED
            po.updated_at = datetime.utcnow()
            await po.save()

        # Update inventory for each received item
        for item in data.received_items:
            item_code = item.get("item_code")
            received_qty = item.get("received_qty", 0) or item.get("accepted_qty", 0)

            if received_qty > 0:
                stock = await InventoryStock.find_one(InventoryStock.item_code == item_code)

                if stock:
                    # Update existing stock
                    balance_before = stock.current_stock
                    stock.current_stock += received_qty
                    stock.available_stock = stock.current_stock - stock.reserved_stock
                    stock.last_movement_date = datetime.utcnow()
                    stock.last_updated = datetime.utcnow()
                    await stock.save()
                else:
                    # Create new stock record
                    balance_before = 0
                    stock = InventoryStock(
                        item_code=item_code,
                        item_name=item.get("item_name"),
                        opening_stock=0,
                        current_stock=received_qty,
                        reserved_stock=0,
                        available_stock=received_qty,
                        warehouse_id=data.warehouse_id,
                        warehouse_name=data.warehouse_name,
                    )
                    await stock.save()

                # Create stock movement record
                movement_id = f"MOV-{datetime.utcnow().strftime('%Y%m%d')}-{item_code[:8]}-GR"
                movement = StockMovement(
                    movement_id=movement_id,
                    item_code=item_code,
                    item_name=item.get("item_name"),
                    movement_type=MovementType.IN,
                    quantity=received_qty,
                    balance_before=balance_before,
                    balance_after=stock.current_stock,
                    reference_type="GR",
                    reference_number=gr_code,
                    remarks=f"Goods Receipt from PO {data.po_code}",
                    created_by=str(current_user.id) if current_user else None
                )
                await movement.save()

        logger.info(f"Created GR: {gr_code}")
        return {"success": True, "gr_code": gr_code, "message": "Goods Receipt created successfully"}

    except Exception as e:
        logger.error(f"Error creating GR: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/goods-receipts")
async def get_goods_receipts(
    po_code: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0),
    limit: int = Query(50),
    current_user=Depends(get_current_user)
):
    """Get all Goods Receipts"""
    try:
        query_conditions = []

        if po_code:
            query_conditions.append(GoodsReceipt.po_code == po_code)
        if status:
            query_conditions.append(GoodsReceipt.status == status)

        if query_conditions:
            grs = await GoodsReceipt.find(*query_conditions).sort("-created_at").skip(skip).limit(limit).to_list()
        else:
            grs = await GoodsReceipt.find_all().sort("-created_at").skip(skip).limit(limit).to_list()

        return [
            {
                "id": str(gr.id),
                "gr_code": gr.gr_code,
                "po_code": gr.po_code,
                "vendor_code": gr.vendor_code,
                "vendor_name": gr.vendor_name,
                "gr_date": gr.gr_date.isoformat() if gr.gr_date else None,
                "status": gr.status,
                "received_items": gr.received_items,
                "invoice_number": gr.invoice_number,
                "quality_check_done": gr.quality_check_done,
                "created_at": gr.created_at.isoformat() if gr.created_at else None,
            }
            for gr in grs
        ]

    except Exception as e:
        logger.error(f"Error fetching GRs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/goods-receipts/{gr_code}/complete")
async def complete_goods_receipt(
    gr_code: str,
    current_user=Depends(get_current_user)
):
    """Mark GR as completed"""
    try:
        gr = await GoodsReceipt.find_one(GoodsReceipt.gr_code == gr_code)
        if not gr:
            raise HTTPException(status_code=404, detail="Goods Receipt not found")

        gr.status = GRStatus.COMPLETED
        gr.quality_check_done = True
        gr.completed_at = datetime.utcnow()
        await gr.save()

        # Check if PO is fully received
        po = await PurchaseOrder.find_one(PurchaseOrder.po_code == gr.po_code)
        if po:
            # Check all GRs for this PO
            all_grs = await GoodsReceipt.find(GoodsReceipt.po_code == gr.po_code).to_list()
            all_completed = all(g.status == GRStatus.COMPLETED for g in all_grs)

            if all_completed:
                po.status = POStatus.FULLY_RECEIVED
                po.updated_at = datetime.utcnow()
                await po.save()

        return {"success": True, "status": "COMPLETED", "message": "GR completed successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing GR {gr_code}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════
# PURCHASE RETURNS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/purchase-returns", status_code=status.HTTP_201_CREATED)
async def create_purchase_return(
    data: PurchaseReturnCreate,
    current_user=Depends(get_current_user)
):
    """Create Purchase Return"""
    try:
        pr_code = await generate_pr_code()

        pr = PurchaseReturn(
            pr_code=pr_code,
            po_code=data.po_code,
            gr_code=data.gr_code,
            vendor_code=data.vendor_code,
            vendor_name=data.vendor_name,
            returned_items=data.returned_items,
            total_return_amount=data.total_return_amount,
            return_reason=data.return_reason,
            remarks=data.remarks,
            requested_by=str(current_user.id) if current_user else None,
            created_by=str(current_user.id) if current_user else None
        )
        await pr.save()

        logger.info(f"Created PR: {pr_code}")
        return {"success": True, "pr_code": pr_code, "message": "Purchase Return created successfully"}

    except Exception as e:
        logger.error(f"Error creating PR: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/purchase-returns")
async def get_purchase_returns(
    status: Optional[str] = Query(None),
    vendor_code: Optional[str] = Query(None),
    skip: int = Query(0),
    limit: int = Query(50),
    current_user=Depends(get_current_user)
):
    """Get all Purchase Returns"""
    try:
        query_conditions = []

        if status:
            query_conditions.append(PurchaseReturn.status == status)
        if vendor_code:
            query_conditions.append(PurchaseReturn.vendor_code == vendor_code)

        if query_conditions:
            prs = await PurchaseReturn.find(*query_conditions).sort("-created_at").skip(skip).limit(limit).to_list()
        else:
            prs = await PurchaseReturn.find_all().sort("-created_at").skip(skip).limit(limit).to_list()

        return [
            {
                "id": str(pr.id),
                "pr_code": pr.pr_code,
                "po_code": pr.po_code,
                "vendor_code": pr.vendor_code,
                "vendor_name": pr.vendor_name,
                "return_date": pr.return_date.isoformat() if pr.return_date else None,
                "status": pr.status,
                "returned_items": pr.returned_items,
                "total_return_amount": pr.total_return_amount,
                "debit_note_number": pr.debit_note_number,
                "created_at": pr.created_at.isoformat() if pr.created_at else None,
            }
            for pr in prs
        ]

    except Exception as e:
        logger.error(f"Error fetching PRs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/purchase-returns/{pr_code}/approve")
async def approve_purchase_return(
    pr_code: str,
    current_user=Depends(get_current_user)
):
    """Approve Purchase Return and update inventory"""
    try:
        pr = await PurchaseReturn.find_one(PurchaseReturn.pr_code == pr_code)
        if not pr:
            raise HTTPException(status_code=404, detail="Purchase Return not found")

        if pr.status != ReturnStatus.PENDING:
            raise HTTPException(status_code=400, detail="Only PENDING returns can be approved")

        pr.status = ReturnStatus.APPROVED
        pr.approved_by = str(current_user.id) if current_user else None
        pr.approved_at = datetime.utcnow()

        # Generate debit note number
        pr.debit_note_number = f"DN-{pr_code}"
        pr.debit_note_date = datetime.utcnow()
        await pr.save()

        # Update inventory for returned items
        for item in pr.returned_items:
            item_code = item.get("item_code")
            return_qty = item.get("return_qty", 0)

            if return_qty > 0:
                stock = await InventoryStock.find_one(InventoryStock.item_code == item_code)
                if stock:
                    balance_before = stock.current_stock
                    stock.current_stock -= return_qty
                    stock.available_stock = stock.current_stock - stock.reserved_stock
                    stock.last_movement_date = datetime.utcnow()
                    stock.last_updated = datetime.utcnow()
                    await stock.save()

                    # Create stock movement record
                    movement_id = f"MOV-{datetime.utcnow().strftime('%Y%m%d')}-{item_code[:8]}-RET"
                    movement = StockMovement(
                        movement_id=movement_id,
                        item_code=item_code,
                        item_name=item.get("item_name"),
                        movement_type=MovementType.RETURN,
                        quantity=return_qty,
                        balance_before=balance_before,
                        balance_after=stock.current_stock,
                        reference_type="PR",
                        reference_number=pr_code,
                        remarks=f"Purchase Return to vendor",
                        created_by=str(current_user.id) if current_user else None
                    )
                    await movement.save()

        return {"success": True, "status": "APPROVED", "debit_note": pr.debit_note_number}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving PR {pr_code}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════
# VENDOR BILLS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/vendor-bills", status_code=status.HTTP_201_CREATED)
async def create_vendor_bill(
    data: VendorBillCreate,
    current_user=Depends(get_current_user)
):
    """Create Vendor Bill"""
    try:
        bill_code = await generate_bill_code()

        # Parse dates
        invoice_date = datetime.fromisoformat(data.invoice_date.replace('Z', '+00:00')) if data.invoice_date else datetime.utcnow()
        due_date = datetime.fromisoformat(data.due_date.replace('Z', '+00:00')) if data.due_date else datetime.utcnow()

        bill = VendorBill(
            bill_code=bill_code,
            po_code=data.po_code,
            gr_code=data.gr_code,
            vendor_code=data.vendor_code,
            vendor_name=data.vendor_name,
            invoice_number=data.invoice_number,
            invoice_date=invoice_date,
            due_date=due_date,
            subtotal=data.subtotal,
            tax_rate=data.tax_rate,
            tax_amount=data.tax_amount,
            discount_amount=data.discount_amount,
            total_amount=data.total_amount,
            pending_amount=data.total_amount,
            payment_terms=data.payment_terms,
            created_by=str(current_user.id) if current_user else None
        )
        await bill.save()

        logger.info(f"Created Bill: {bill_code}")
        return {"success": True, "bill_code": bill_code, "message": "Vendor Bill created successfully"}

    except Exception as e:
        logger.error(f"Error creating bill: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vendor-bills")
async def get_vendor_bills(
    status: Optional[str] = Query(None),
    vendor_code: Optional[str] = Query(None),
    skip: int = Query(0),
    limit: int = Query(50),
    current_user=Depends(get_current_user)
):
    """Get all Vendor Bills"""
    try:
        query_conditions = []

        if status:
            query_conditions.append(VendorBill.status == status)
        if vendor_code:
            query_conditions.append(VendorBill.vendor_code == vendor_code)

        if query_conditions:
            bills = await VendorBill.find(*query_conditions).sort("-created_at").skip(skip).limit(limit).to_list()
        else:
            bills = await VendorBill.find_all().sort("-created_at").skip(skip).limit(limit).to_list()

        return [
            {
                "id": str(bill.id),
                "bill_code": bill.bill_code,
                "po_code": bill.po_code,
                "vendor_code": bill.vendor_code,
                "vendor_name": bill.vendor_name,
                "invoice_number": bill.invoice_number,
                "invoice_date": bill.invoice_date.isoformat() if bill.invoice_date else None,
                "due_date": bill.due_date.isoformat() if bill.due_date else None,
                "total_amount": bill.total_amount,
                "paid_amount": bill.paid_amount,
                "pending_amount": bill.pending_amount,
                "status": bill.status,
                "created_at": bill.created_at.isoformat() if bill.created_at else None,
            }
            for bill in bills
        ]

    except Exception as e:
        logger.error(f"Error fetching bills: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/vendor-bills/{bill_code}/payment")
async def record_payment(
    bill_code: str,
    data: PaymentCreate,
    current_user=Depends(get_current_user)
):
    """Record payment for vendor bill"""
    try:
        bill = await VendorBill.find_one(VendorBill.bill_code == bill_code)
        if not bill:
            raise HTTPException(status_code=404, detail="Bill not found")

        if bill.status == BillStatus.PAID:
            raise HTTPException(status_code=400, detail="Bill is already fully paid")

        if data.amount <= 0:
            raise HTTPException(status_code=400, detail="Payment amount must be positive")

        if data.amount > bill.pending_amount:
            raise HTTPException(status_code=400, detail="Payment amount exceeds pending amount")

        # Record payment
        payment_record = {
            "amount": data.amount,
            "date": datetime.utcnow().isoformat(),
            "reference": data.reference,
            "method": data.method
        }
        bill.payments.append(payment_record)

        # Update amounts
        bill.paid_amount += data.amount
        bill.pending_amount = bill.total_amount - bill.paid_amount

        # Update status
        if bill.pending_amount <= 0:
            bill.status = BillStatus.PAID
            bill.pending_amount = 0
        else:
            bill.status = BillStatus.PARTIALLY_PAID

        bill.last_payment_date = datetime.utcnow()
        bill.last_payment_reference = data.reference
        bill.updated_at = datetime.utcnow()
        await bill.save()

        return {
            "success": True,
            "paid_amount": bill.paid_amount,
            "pending_amount": bill.pending_amount,
            "status": bill.status,
            "message": "Payment recorded successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recording payment for {bill_code}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════
# REPORTS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/reports/purchase-summary")
async def purchase_summary(current_user=Depends(get_current_user)):
    """Get purchase summary statistics"""
    try:
        total_pos = await PurchaseOrder.count()
        total_grs = await GoodsReceipt.count()
        total_prs = await PurchaseReturn.count()
        total_bills = await VendorBill.count()

        # Calculate total PO value
        all_pos = await PurchaseOrder.find_all().to_list()
        total_po_value = sum(po.total_amount for po in all_pos)

        # Pending bills count and value
        pending_bills = await VendorBill.find(VendorBill.status != BillStatus.PAID).to_list()
        pending_bills_count = len(pending_bills)
        pending_bills_value = sum(b.pending_amount for b in pending_bills)

        # Status breakdown
        draft_pos = await PurchaseOrder.find(PurchaseOrder.status == POStatus.DRAFT).count()
        approved_pos = await PurchaseOrder.find(PurchaseOrder.status == POStatus.APPROVED).count()
        received_pos = await PurchaseOrder.find(PurchaseOrder.status == POStatus.FULLY_RECEIVED).count()

        return {
            "total_purchase_orders": total_pos,
            "total_goods_receipts": total_grs,
            "total_returns": total_prs,
            "total_bills": total_bills,
            "total_po_value": total_po_value,
            "pending_bills_count": pending_bills_count,
            "pending_bills_value": pending_bills_value,
            "po_status_breakdown": {
                "draft": draft_pos,
                "approved": approved_pos,
                "received": received_pos
            }
        }

    except Exception as e:
        logger.error(f"Error getting purchase summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/pending-po")
async def pending_po_report(current_user=Depends(get_current_user)):
    """Get pending Purchase Orders report"""
    try:
        pos = await PurchaseOrder.find(
            {"status": {"$in": [
                POStatus.DRAFT.value,
                POStatus.SUBMITTED.value,
                POStatus.APPROVED.value,
                POStatus.PARTIALLY_RECEIVED.value
            ]}}
        ).sort("-created_at").to_list()

        return {
            "pending_count": len(pos),
            "orders": [
                {
                    "po_code": po.po_code,
                    "vendor_name": po.vendor_name,
                    "total_amount": po.total_amount,
                    "status": po.status,
                    "delivery_date": po.delivery_date.isoformat() if po.delivery_date else None,
                    "created_at": po.created_at.isoformat() if po.created_at else None,
                }
                for po in pos
            ]
        }

    except Exception as e:
        logger.error(f"Error getting pending PO report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/outstanding-bills")
async def outstanding_bills_report(current_user=Depends(get_current_user)):
    """Get outstanding bills report"""
    try:
        bills = await VendorBill.find(
            VendorBill.status != BillStatus.PAID
        ).sort("due_date").to_list()

        total_outstanding = sum(b.pending_amount for b in bills)

        # Categorize by age
        today = datetime.utcnow()
        overdue = []
        due_soon = []
        upcoming = []

        for bill in bills:
            bill_data = {
                "bill_code": bill.bill_code,
                "vendor_name": bill.vendor_name,
                "invoice_number": bill.invoice_number,
                "total_amount": bill.total_amount,
                "pending_amount": bill.pending_amount,
                "due_date": bill.due_date.isoformat() if bill.due_date else None,
            }

            if bill.due_date:
                days_until_due = (bill.due_date - today).days
                if days_until_due < 0:
                    overdue.append(bill_data)
                elif days_until_due <= 7:
                    due_soon.append(bill_data)
                else:
                    upcoming.append(bill_data)

        return {
            "outstanding_count": len(bills),
            "total_outstanding": total_outstanding,
            "overdue": overdue,
            "due_soon": due_soon,
            "upcoming": upcoming,
            "all_bills": [
                {
                    "bill_code": b.bill_code,
                    "vendor_name": b.vendor_name,
                    "pending_amount": b.pending_amount,
                    "due_date": b.due_date.isoformat() if b.due_date else None,
                }
                for b in bills
            ]
        }

    except Exception as e:
        logger.error(f"Error getting outstanding bills report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/vendor-performance")
async def vendor_performance_report(current_user=Depends(get_current_user)):
    """Get vendor performance report"""
    try:
        # Get all unique vendors from POs
        all_pos = await PurchaseOrder.find_all().to_list()
        vendor_codes = list(set(po.vendor_code for po in all_pos))

        performance = []
        for vendor_code in vendor_codes:
            vendor_pos = [po for po in all_pos if po.vendor_code == vendor_code]

            if vendor_pos:
                total_orders = len(vendor_pos)
                total_value = sum(po.total_amount for po in vendor_pos)
                completed_orders = len([po for po in vendor_pos if po.status == POStatus.FULLY_RECEIVED])
                vendor_name = vendor_pos[0].vendor_name if vendor_pos else vendor_code

                # Get returns for this vendor
                returns = await PurchaseReturn.find(PurchaseReturn.vendor_code == vendor_code).count()

                performance.append({
                    "vendor_code": vendor_code,
                    "vendor_name": vendor_name,
                    "total_orders": total_orders,
                    "completed_orders": completed_orders,
                    "total_value": total_value,
                    "average_order_value": total_value / total_orders if total_orders > 0 else 0,
                    "returns_count": returns,
                    "completion_rate": (completed_orders / total_orders * 100) if total_orders > 0 else 0
                })

        # Sort by total value descending
        performance.sort(key=lambda x: x['total_value'], reverse=True)

        return performance

    except Exception as e:
        logger.error(f"Error getting vendor performance report: {e}")
        raise HTTPException(status_code=500, detail=str(e))
