"""
Inventory Management API Routes
- Dashboard overview
- Stock movements
- Stock adjustments
- Stock transfers
- Stock levels
- Stock issues
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional, List
from datetime import datetime
import logging

from ..models.inventory_management import (
    InventoryStock,
    StockMovement,
    StockAdjustment,
    StockTransfer,
    StockLevel,
    StockIssue,
    MovementType,
    AdjustmentReason,
    TransferStatus,
    StockMovementCreate,
    StockAdjustmentCreate,
    StockTransferCreate,
    StockIssueCreate,
    AddStockRequest,
    RemoveStockRequest,
)
from ..models.item import ItemMaster
from ..core.dependencies import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


# ==================== HELPER FUNCTIONS ====================

async def generate_movement_id():
    """Generate unique movement ID: MOV-YYYYMMDD-XXXX"""
    today = datetime.utcnow().strftime("%Y%m%d")
    prefix = f"MOV-{today}-"

    # Use regex query instead of .startswith() which returns boolean in Beanie
    latest = await StockMovement.find(
        {"movement_id": {"$regex": f"^{prefix}"}}
    ).sort("-movement_id").first_or_none()

    if latest:
        try:
            last_num = int(latest.movement_id.split("-")[-1])
            next_num = last_num + 1
        except:
            next_num = 1
    else:
        next_num = 1

    return f"{prefix}{str(next_num).zfill(4)}"


async def generate_adjustment_id():
    """Generate unique adjustment ID: ADJ-YYYYMMDD-XXXX"""
    today = datetime.utcnow().strftime("%Y%m%d")
    prefix = f"ADJ-{today}-"

    # Use regex query instead of .startswith() which returns boolean in Beanie
    latest = await StockAdjustment.find(
        {"adjustment_id": {"$regex": f"^{prefix}"}}
    ).sort("-adjustment_id").first_or_none()

    if latest:
        try:
            last_num = int(latest.adjustment_id.split("-")[-1])
            next_num = last_num + 1
        except:
            next_num = 1
    else:
        next_num = 1

    return f"{prefix}{str(next_num).zfill(4)}"


async def generate_transfer_id():
    """Generate unique transfer ID: TRF-YYYYMMDD-XXXX"""
    today = datetime.utcnow().strftime("%Y%m%d")
    prefix = f"TRF-{today}-"

    # Use regex query instead of .startswith() which returns boolean in Beanie
    latest = await StockTransfer.find(
        {"transfer_id": {"$regex": f"^{prefix}"}}
    ).sort("-transfer_id").first_or_none()

    if latest:
        try:
            last_num = int(latest.transfer_id.split("-")[-1])
            next_num = last_num + 1
        except:
            next_num = 1
    else:
        next_num = 1

    return f"{prefix}{str(next_num).zfill(4)}"


async def generate_issue_id():
    """Generate unique issue ID: ISS-YYYYMMDD-XXXX"""
    today = datetime.utcnow().strftime("%Y%m%d")
    prefix = f"ISS-{today}-"

    # Use regex query instead of .startswith() which returns boolean in Beanie
    latest = await StockIssue.find(
        {"issue_id": {"$regex": f"^{prefix}"}}
    ).sort("-issue_id").first_or_none()

    if latest:
        try:
            last_num = int(latest.issue_id.split("-")[-1])
            next_num = last_num + 1
        except:
            next_num = 1
    else:
        next_num = 1

    return f"{prefix}{str(next_num).zfill(4)}"


# ==================== DASHBOARD ====================

@router.get("/dashboard")
async def inventory_dashboard(current_user=Depends(get_current_user)):
    """Get inventory overview dashboard"""
    try:
        # Total items count
        total_items = await ItemMaster.find(ItemMaster.deleted_at == None).count()

        # Get all inventory stocks
        all_stocks = await InventoryStock.find_all().to_list()

        # Calculate totals
        total_stock_qty = sum(s.current_stock for s in all_stocks)
        total_stock_value = sum(s.total_value for s in all_stocks)
        total_reserved = sum(s.reserved_stock for s in all_stocks)

        # Get stock levels for comparison
        stock_levels = await StockLevel.find_all().to_list()
        stock_level_map = {sl.item_code: sl for sl in stock_levels}

        # Find low stock items
        low_stock_items = []
        for stock in all_stocks:
            level = stock_level_map.get(stock.item_code)
            min_stock = level.minimum_stock if level else 10

            if stock.current_stock <= min_stock:
                low_stock_items.append({
                    "item_code": stock.item_code,
                    "item_name": stock.item_name,
                    "current_stock": stock.current_stock,
                    "minimum_stock": min_stock,
                    "shortage": min_stock - stock.current_stock
                })

        # Sort by shortage (most critical first)
        low_stock_items.sort(key=lambda x: x["shortage"], reverse=True)

        # Recent movements (last 10)
        recent_movements = await StockMovement.find().sort("-created_at").limit(10).to_list()

        return {
            "total_items": total_items,
            "total_stock_qty": total_stock_qty,
            "total_stock_value": total_stock_value,
            "total_reserved": total_reserved,
            "low_stock_count": len(low_stock_items),
            "low_stock_items": low_stock_items[:5],
            "recent_movements": [
                {
                    "movement_id": m.movement_id,
                    "item_code": m.item_code,
                    "item_name": m.item_name,
                    "movement_type": m.movement_type,
                    "quantity": m.quantity,
                    "created_at": m.created_at.isoformat() if m.created_at else None
                }
                for m in recent_movements
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching inventory dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== INVENTORY STOCK ====================

@router.get("/")
async def list_inventory(
    search: Optional[str] = Query(None),
    warehouse_id: Optional[str] = Query(None),
    skip: int = Query(0),
    limit: int = Query(50),
    current_user=Depends(get_current_user)
):
    """List all inventory stock levels"""
    try:
        query_conditions = []

        if warehouse_id:
            query_conditions.append(InventoryStock.warehouse_id == warehouse_id)

        if query_conditions:
            stocks = await InventoryStock.find(*query_conditions).skip(skip).limit(limit).to_list()
        else:
            stocks = await InventoryStock.find_all().skip(skip).limit(limit).to_list()

        # Apply search filter
        if search:
            search_lower = search.lower()
            stocks = [
                s for s in stocks
                if search_lower in (s.item_code or "").lower() or
                   search_lower in (s.item_name or "").lower()
            ]

        return [
            {
                "id": str(s.id),
                "item_code": s.item_code,
                "item_name": s.item_name,
                "opening_stock": s.opening_stock,
                "current_stock": s.current_stock,
                "reserved_stock": s.reserved_stock,
                "available_stock": s.available_stock,
                "warehouse_name": s.warehouse_name,
                "unit_cost": s.unit_cost,
                "total_value": s.total_value,
                "last_updated": s.last_updated.isoformat() if s.last_updated else None
            }
            for s in stocks
        ]
    except Exception as e:
        logger.error(f"Error listing inventory: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{item_code}")
async def get_item_inventory(item_code: str, current_user=Depends(get_current_user)):
    """Get inventory details for a specific item"""
    try:
        stock = await InventoryStock.find_one(InventoryStock.item_code == item_code)

        if not stock:
            # Check if item exists
            item = await ItemMaster.find_one(ItemMaster.item_code == item_code)
            if not item:
                raise HTTPException(status_code=404, detail=f"Item '{item_code}' not found")

            # Return empty stock info
            return {
                "stock": {
                    "item_code": item_code,
                    "item_name": item.item_name,
                    "opening_stock": 0,
                    "current_stock": 0,
                    "reserved_stock": 0,
                    "available_stock": 0,
                    "total_value": 0
                },
                "recent_movements": [],
                "stock_level": None
            }

        # Get recent movements
        movements = await StockMovement.find(
            StockMovement.item_code == item_code
        ).sort("-created_at").limit(20).to_list()

        # Get stock level settings
        stock_level = await StockLevel.find_one(StockLevel.item_code == item_code)

        return {
            "stock": {
                "id": str(stock.id),
                "item_code": stock.item_code,
                "item_name": stock.item_name,
                "opening_stock": stock.opening_stock,
                "current_stock": stock.current_stock,
                "reserved_stock": stock.reserved_stock,
                "available_stock": stock.available_stock,
                "warehouse_name": stock.warehouse_name,
                "unit_cost": stock.unit_cost,
                "total_value": stock.total_value,
                "last_updated": stock.last_updated.isoformat() if stock.last_updated else None
            },
            "recent_movements": [
                {
                    "movement_id": m.movement_id,
                    "movement_type": m.movement_type,
                    "quantity": m.quantity,
                    "balance_after": m.balance_after,
                    "reference_number": m.reference_number,
                    "remarks": m.remarks,
                    "created_at": m.created_at.isoformat() if m.created_at else None
                }
                for m in movements
            ],
            "stock_level": {
                "minimum_stock": stock_level.minimum_stock,
                "maximum_stock": stock_level.maximum_stock,
                "reorder_point": stock_level.reorder_point,
                "reorder_quantity": stock_level.reorder_quantity
            } if stock_level else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting item inventory: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== ADD/REMOVE STOCK ====================

@router.post("/add-stock")
async def add_stock(data: AddStockRequest, current_user=Depends(get_current_user)):
    """Add stock to an item"""
    try:
        # Get or create inventory stock record
        stock = await InventoryStock.find_one(InventoryStock.item_code == data.item_code)

        if not stock:
            # Get item details
            item = await ItemMaster.find_one(ItemMaster.item_code == data.item_code)
            if not item:
                raise HTTPException(status_code=404, detail=f"Item '{data.item_code}' not found")

            stock = InventoryStock(
                item_code=data.item_code,
                item_name=item.item_name,
                opening_stock=0,
                current_stock=0,
                reserved_stock=0,
                available_stock=0,
                unit_cost=data.unit_cost or 0,
                total_value=0
            )

        balance_before = stock.current_stock

        # Update stock
        stock.current_stock += data.quantity
        stock.available_stock = stock.current_stock - stock.reserved_stock
        stock.unit_cost = data.unit_cost or stock.unit_cost
        stock.total_value = stock.current_stock * stock.unit_cost
        stock.last_movement_date = datetime.utcnow()
        stock.last_updated = datetime.utcnow()

        await stock.save()

        # Record movement
        movement = StockMovement(
            movement_id=await generate_movement_id(),
            item_code=data.item_code,
            item_name=stock.item_name,
            movement_type=MovementType.IN,
            quantity=data.quantity,
            unit_cost=data.unit_cost or 0,
            total_value=data.quantity * (data.unit_cost or 0),
            balance_before=balance_before,
            balance_after=stock.current_stock,
            reference_type=data.reference_type,
            reference_number=data.reference_number,
            remarks=data.remarks,
            created_by=str(current_user.id) if current_user else None
        )
        await movement.save()

        # Update item's current_stock
        item = await ItemMaster.find_one(ItemMaster.item_code == data.item_code)
        if item:
            item.current_stock = int(stock.current_stock)
            item.updated_at = datetime.utcnow()
            await item.save()

        return {
            "success": True,
            "message": f"Added {data.quantity} units to {data.item_code}",
            "new_stock": stock.current_stock,
            "movement_id": movement.movement_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding stock: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/remove-stock")
async def remove_stock(data: RemoveStockRequest, current_user=Depends(get_current_user)):
    """Remove stock from an item"""
    try:
        stock = await InventoryStock.find_one(InventoryStock.item_code == data.item_code)

        if not stock:
            raise HTTPException(status_code=404, detail=f"No inventory found for item '{data.item_code}'")

        if stock.available_stock < data.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock. Available: {stock.available_stock}, Requested: {data.quantity}"
            )

        balance_before = stock.current_stock

        # Update stock
        stock.current_stock -= data.quantity
        stock.available_stock = stock.current_stock - stock.reserved_stock
        stock.total_value = stock.current_stock * stock.unit_cost
        stock.last_movement_date = datetime.utcnow()
        stock.last_updated = datetime.utcnow()

        await stock.save()

        # Record movement
        movement = StockMovement(
            movement_id=await generate_movement_id(),
            item_code=data.item_code,
            item_name=stock.item_name,
            movement_type=MovementType.OUT,
            quantity=data.quantity,
            unit_cost=stock.unit_cost,
            total_value=data.quantity * stock.unit_cost,
            balance_before=balance_before,
            balance_after=stock.current_stock,
            reference_type=data.reference_type,
            reference_number=data.reference_number,
            remarks=data.remarks,
            created_by=str(current_user.id) if current_user else None
        )
        await movement.save()

        # Update item's current_stock
        item = await ItemMaster.find_one(ItemMaster.item_code == data.item_code)
        if item:
            item.current_stock = int(stock.current_stock)
            item.updated_at = datetime.utcnow()
            await item.save()

        return {
            "success": True,
            "message": f"Removed {data.quantity} units from {data.item_code}",
            "new_stock": stock.current_stock,
            "movement_id": movement.movement_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing stock: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== STOCK MOVEMENTS ====================

@router.get("/stock-movements/list")
async def list_stock_movements(
    item_code: Optional[str] = Query(None),
    movement_type: Optional[str] = Query(None),
    skip: int = Query(0),
    limit: int = Query(50),
    current_user=Depends(get_current_user)
):
    """Get stock movements with filters"""
    try:
        query_conditions = []

        if item_code:
            query_conditions.append(StockMovement.item_code == item_code)
        if movement_type:
            query_conditions.append(StockMovement.movement_type == movement_type)

        if query_conditions:
            movements = await StockMovement.find(*query_conditions).sort("-created_at").skip(skip).limit(limit).to_list()
        else:
            movements = await StockMovement.find().sort("-created_at").skip(skip).limit(limit).to_list()

        return [
            {
                "id": str(m.id),
                "movement_id": m.movement_id,
                "item_code": m.item_code,
                "item_name": m.item_name,
                "movement_type": m.movement_type,
                "quantity": m.quantity,
                "unit_cost": m.unit_cost,
                "total_value": m.total_value,
                "balance_before": m.balance_before,
                "balance_after": m.balance_after,
                "reference_type": m.reference_type,
                "reference_number": m.reference_number,
                "remarks": m.remarks,
                "created_by": m.created_by,
                "created_at": m.created_at.isoformat() if m.created_at else None
            }
            for m in movements
        ]
    except Exception as e:
        logger.error(f"Error listing stock movements: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== STOCK ADJUSTMENTS ====================

@router.get("/stock-adjustments/list")
async def list_stock_adjustments(
    item_code: Optional[str] = Query(None),
    reason: Optional[str] = Query(None),
    skip: int = Query(0),
    limit: int = Query(50),
    current_user=Depends(get_current_user)
):
    """Get stock adjustments with filters"""
    try:
        query_conditions = []

        if item_code:
            query_conditions.append(StockAdjustment.item_code == item_code)
        if reason:
            query_conditions.append(StockAdjustment.reason == reason)

        if query_conditions:
            adjustments = await StockAdjustment.find(*query_conditions).sort("-created_at").skip(skip).limit(limit).to_list()
        else:
            adjustments = await StockAdjustment.find().sort("-created_at").skip(skip).limit(limit).to_list()

        return [
            {
                "id": str(a.id),
                "adjustment_id": a.adjustment_id,
                "item_code": a.item_code,
                "item_name": a.item_name,
                "previous_stock": a.previous_stock,
                "adjusted_stock": a.adjusted_stock,
                "adjustment_quantity": a.adjustment_quantity,
                "reason": a.reason,
                "remarks": a.remarks,
                "created_by": a.created_by,
                "created_at": a.created_at.isoformat() if a.created_at else None
            }
            for a in adjustments
        ]
    except Exception as e:
        logger.error(f"Error listing stock adjustments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stock-adjustments/create")
async def create_stock_adjustment(data: StockAdjustmentCreate, current_user=Depends(get_current_user)):
    """Create a stock adjustment"""
    try:
        # Get current stock
        stock = await InventoryStock.find_one(InventoryStock.item_code == data.item_code)

        if not stock:
            item = await ItemMaster.find_one(ItemMaster.item_code == data.item_code)
            if not item:
                raise HTTPException(status_code=404, detail=f"Item '{data.item_code}' not found")

            # Create stock record if doesn't exist
            stock = InventoryStock(
                item_code=data.item_code,
                item_name=item.item_name,
                opening_stock=0,
                current_stock=0,
                reserved_stock=0,
                available_stock=0
            )

        previous_stock = stock.current_stock
        adjustment_quantity = data.adjusted_stock - previous_stock

        # Create adjustment record
        adjustment = StockAdjustment(
            adjustment_id=await generate_adjustment_id(),
            item_code=data.item_code,
            item_name=stock.item_name,
            previous_stock=previous_stock,
            adjusted_stock=data.adjusted_stock,
            adjustment_quantity=adjustment_quantity,
            reason=data.reason,
            remarks=data.remarks,
            warehouse_id=data.warehouse_id,
            created_by=str(current_user.id) if current_user else None
        )
        await adjustment.save()

        # Update stock
        stock.current_stock = data.adjusted_stock
        stock.available_stock = stock.current_stock - stock.reserved_stock
        stock.total_value = stock.current_stock * stock.unit_cost
        stock.last_movement_date = datetime.utcnow()
        stock.last_updated = datetime.utcnow()
        await stock.save()

        # Record movement
        movement = StockMovement(
            movement_id=await generate_movement_id(),
            item_code=data.item_code,
            item_name=stock.item_name,
            movement_type=MovementType.ADJUSTMENT,
            quantity=abs(adjustment_quantity),
            balance_before=previous_stock,
            balance_after=stock.current_stock,
            reference_type="ADJUSTMENT",
            reference_number=adjustment.adjustment_id,
            remarks=f"{data.reason}: {data.remarks}" if data.remarks else data.reason,
            created_by=str(current_user.id) if current_user else None
        )
        await movement.save()

        # Update item's current_stock
        item = await ItemMaster.find_one(ItemMaster.item_code == data.item_code)
        if item:
            item.current_stock = int(stock.current_stock)
            item.updated_at = datetime.utcnow()
            await item.save()

        return {
            "success": True,
            "adjustment_id": adjustment.adjustment_id,
            "message": f"Stock adjusted from {previous_stock} to {data.adjusted_stock}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating stock adjustment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== STOCK TRANSFERS ====================

@router.get("/stock-transfers/list")
async def list_stock_transfers(
    status: Optional[str] = Query(None),
    skip: int = Query(0),
    limit: int = Query(50),
    current_user=Depends(get_current_user)
):
    """Get stock transfers with filters"""
    try:
        query_conditions = []

        if status:
            query_conditions.append(StockTransfer.status == status)

        if query_conditions:
            transfers = await StockTransfer.find(*query_conditions).sort("-requested_at").skip(skip).limit(limit).to_list()
        else:
            transfers = await StockTransfer.find().sort("-requested_at").skip(skip).limit(limit).to_list()

        return [
            {
                "id": str(t.id),
                "transfer_id": t.transfer_id,
                "item_code": t.item_code,
                "item_name": t.item_name,
                "quantity": t.quantity,
                "from_warehouse_name": t.from_warehouse_name,
                "from_location": t.from_location,
                "to_warehouse_name": t.to_warehouse_name,
                "to_location": t.to_location,
                "status": t.status,
                "requested_at": t.requested_at.isoformat() if t.requested_at else None,
                "completed_at": t.completed_at.isoformat() if t.completed_at else None,
                "remarks": t.remarks
            }
            for t in transfers
        ]
    except Exception as e:
        logger.error(f"Error listing stock transfers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stock-transfers/create")
async def create_stock_transfer(data: StockTransferCreate, current_user=Depends(get_current_user)):
    """Create a stock transfer request"""
    try:
        # Verify item exists
        item = await ItemMaster.find_one(ItemMaster.item_code == data.item_code)
        if not item:
            raise HTTPException(status_code=404, detail=f"Item '{data.item_code}' not found")

        # Check available stock
        stock = await InventoryStock.find_one(InventoryStock.item_code == data.item_code)
        if not stock or stock.available_stock < data.quantity:
            available = stock.available_stock if stock else 0
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock. Available: {available}, Requested: {data.quantity}"
            )

        transfer = StockTransfer(
            transfer_id=await generate_transfer_id(),
            item_code=data.item_code,
            item_name=item.item_name,
            quantity=data.quantity,
            from_warehouse_id=data.from_warehouse_id,
            from_warehouse_name=data.from_warehouse_id,  # TODO: Get from warehouse master
            from_location=data.from_location,
            to_warehouse_id=data.to_warehouse_id,
            to_warehouse_name=data.to_warehouse_id,  # TODO: Get from warehouse master
            to_location=data.to_location,
            status=TransferStatus.PENDING,
            requested_by=str(current_user.id) if current_user else None,
            remarks=data.remarks
        )
        await transfer.save()

        # Reserve the stock
        stock.reserved_stock += data.quantity
        stock.available_stock = stock.current_stock - stock.reserved_stock
        stock.last_updated = datetime.utcnow()
        await stock.save()

        return {
            "success": True,
            "transfer_id": transfer.transfer_id,
            "message": f"Transfer request created for {data.quantity} units"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating stock transfer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stock-transfers/{transfer_id}/complete")
async def complete_stock_transfer(transfer_id: str, current_user=Depends(get_current_user)):
    """Complete a stock transfer"""
    try:
        transfer = await StockTransfer.find_one(StockTransfer.transfer_id == transfer_id)

        if not transfer:
            raise HTTPException(status_code=404, detail=f"Transfer '{transfer_id}' not found")

        if transfer.status != TransferStatus.PENDING:
            raise HTTPException(status_code=400, detail=f"Transfer is already {transfer.status}")

        # Get stock
        stock = await InventoryStock.find_one(InventoryStock.item_code == transfer.item_code)
        if not stock:
            raise HTTPException(status_code=404, detail="Stock record not found")

        balance_before = stock.current_stock

        # Update stock (remove from reserved, update quantities)
        stock.reserved_stock -= transfer.quantity
        stock.current_stock -= transfer.quantity
        stock.available_stock = stock.current_stock - stock.reserved_stock
        stock.total_value = stock.current_stock * stock.unit_cost
        stock.last_movement_date = datetime.utcnow()
        stock.last_updated = datetime.utcnow()
        await stock.save()

        # Update transfer status
        transfer.status = TransferStatus.COMPLETED
        transfer.completed_by = str(current_user.id) if current_user else None
        transfer.completed_at = datetime.utcnow()
        await transfer.save()

        # Record movement
        movement = StockMovement(
            movement_id=await generate_movement_id(),
            item_code=transfer.item_code,
            item_name=transfer.item_name,
            movement_type=MovementType.TRANSFER,
            quantity=transfer.quantity,
            balance_before=balance_before,
            balance_after=stock.current_stock,
            from_location=transfer.from_location,
            to_location=transfer.to_location,
            reference_type="TRANSFER",
            reference_number=transfer_id,
            remarks=f"Transfer to {transfer.to_warehouse_name or transfer.to_location}",
            created_by=str(current_user.id) if current_user else None
        )
        await movement.save()

        # Update item's current_stock
        item = await ItemMaster.find_one(ItemMaster.item_code == transfer.item_code)
        if item:
            item.current_stock = int(stock.current_stock)
            item.updated_at = datetime.utcnow()
            await item.save()

        return {
            "success": True,
            "message": f"Transfer {transfer_id} completed successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing stock transfer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stock-transfers/{transfer_id}/cancel")
async def cancel_stock_transfer(transfer_id: str, current_user=Depends(get_current_user)):
    """Cancel a stock transfer"""
    try:
        transfer = await StockTransfer.find_one(StockTransfer.transfer_id == transfer_id)

        if not transfer:
            raise HTTPException(status_code=404, detail=f"Transfer '{transfer_id}' not found")

        if transfer.status != TransferStatus.PENDING:
            raise HTTPException(status_code=400, detail=f"Cannot cancel transfer with status {transfer.status}")

        # Release reserved stock
        stock = await InventoryStock.find_one(InventoryStock.item_code == transfer.item_code)
        if stock:
            stock.reserved_stock -= transfer.quantity
            stock.available_stock = stock.current_stock - stock.reserved_stock
            stock.last_updated = datetime.utcnow()
            await stock.save()

        # Update transfer status
        transfer.status = TransferStatus.CANCELLED
        await transfer.save()

        return {
            "success": True,
            "message": f"Transfer {transfer_id} cancelled"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling stock transfer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== STOCK LEVELS ====================

@router.get("/stock-levels/list")
async def list_stock_levels(
    low_stock_only: bool = Query(False),
    current_user=Depends(get_current_user)
):
    """Get stock level settings, optionally filtered to low stock items"""
    try:
        stock_levels = await StockLevel.find_all().to_list()
        all_stocks = await InventoryStock.find_all().to_list()

        stock_map = {s.item_code: s for s in all_stocks}

        result = []
        for level in stock_levels:
            stock = stock_map.get(level.item_code)
            current_stock = stock.current_stock if stock else 0

            is_low_stock = current_stock <= level.minimum_stock

            if low_stock_only and not is_low_stock:
                continue

            result.append({
                "id": str(level.id),
                "item_code": level.item_code,
                "item_name": level.item_name,
                "current_stock": current_stock,
                "minimum_stock": level.minimum_stock,
                "maximum_stock": level.maximum_stock,
                "reorder_point": level.reorder_point,
                "reorder_quantity": level.reorder_quantity,
                "is_low_stock": is_low_stock,
                "shortage": level.minimum_stock - current_stock if is_low_stock else 0
            })

        # Sort by shortage (most critical first)
        result.sort(key=lambda x: x["shortage"], reverse=True)

        return result
    except Exception as e:
        logger.error(f"Error listing stock levels: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/stock-levels/{item_code}")
async def update_stock_level(
    item_code: str,
    minimum_stock: float = Query(...),
    maximum_stock: float = Query(...),
    reorder_point: float = Query(...),
    reorder_quantity: float = Query(...),
    current_user=Depends(get_current_user)
):
    """Update stock level settings for an item"""
    try:
        level = await StockLevel.find_one(StockLevel.item_code == item_code)

        if not level:
            # Get item details
            item = await ItemMaster.find_one(ItemMaster.item_code == item_code)
            if not item:
                raise HTTPException(status_code=404, detail=f"Item '{item_code}' not found")

            level = StockLevel(
                item_code=item_code,
                item_name=item.item_name
            )

        level.minimum_stock = minimum_stock
        level.maximum_stock = maximum_stock
        level.reorder_point = reorder_point
        level.reorder_quantity = reorder_quantity
        level.updated_at = datetime.utcnow()

        await level.save()

        return {
            "success": True,
            "message": f"Stock levels updated for {item_code}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating stock level: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== STOCK ISSUES ====================

@router.get("/stock-issues/list")
async def list_stock_issues(
    item_code: Optional[str] = Query(None),
    issue_type: Optional[str] = Query(None),
    skip: int = Query(0),
    limit: int = Query(50),
    current_user=Depends(get_current_user)
):
    """Get stock issues with filters"""
    try:
        query_conditions = []

        if item_code:
            query_conditions.append(StockIssue.item_code == item_code)
        if issue_type:
            query_conditions.append(StockIssue.issue_type == issue_type)

        if query_conditions:
            issues = await StockIssue.find(*query_conditions).sort("-issued_at").skip(skip).limit(limit).to_list()
        else:
            issues = await StockIssue.find().sort("-issued_at").skip(skip).limit(limit).to_list()

        return [
            {
                "id": str(i.id),
                "issue_id": i.issue_id,
                "item_code": i.item_code,
                "item_name": i.item_name,
                "quantity": i.quantity,
                "issue_type": i.issue_type,
                "department": i.department,
                "purpose": i.purpose,
                "reference_number": i.reference_number,
                "issued_by": i.issued_by,
                "issued_at": i.issued_at.isoformat() if i.issued_at else None,
                "remarks": i.remarks
            }
            for i in issues
        ]
    except Exception as e:
        logger.error(f"Error listing stock issues: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stock-issues/create")
async def create_stock_issue(data: StockIssueCreate, current_user=Depends(get_current_user)):
    """Create a stock issue"""
    try:
        # Verify item exists
        item = await ItemMaster.find_one(ItemMaster.item_code == data.item_code)
        if not item:
            raise HTTPException(status_code=404, detail=f"Item '{data.item_code}' not found")

        # Check available stock
        stock = await InventoryStock.find_one(InventoryStock.item_code == data.item_code)
        if not stock or stock.available_stock < data.quantity:
            available = stock.available_stock if stock else 0
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock. Available: {available}, Requested: {data.quantity}"
            )

        balance_before = stock.current_stock

        # Create issue record
        issue = StockIssue(
            issue_id=await generate_issue_id(),
            item_code=data.item_code,
            item_name=item.item_name,
            quantity=data.quantity,
            issue_type=data.issue_type,
            department=data.department,
            purpose=data.purpose,
            reference_number=data.reference_number,
            issued_by=str(current_user.id) if current_user else None,
            remarks=data.remarks
        )
        await issue.save()

        # Update stock
        stock.current_stock -= data.quantity
        stock.available_stock = stock.current_stock - stock.reserved_stock
        stock.total_value = stock.current_stock * stock.unit_cost
        stock.last_movement_date = datetime.utcnow()
        stock.last_updated = datetime.utcnow()
        await stock.save()

        # Record movement
        movement = StockMovement(
            movement_id=await generate_movement_id(),
            item_code=data.item_code,
            item_name=item.item_name,
            movement_type=MovementType.ISSUE,
            quantity=data.quantity,
            balance_before=balance_before,
            balance_after=stock.current_stock,
            reference_type="ISSUE",
            reference_number=issue.issue_id,
            remarks=f"{data.issue_type}: {data.purpose or data.remarks or ''}",
            created_by=str(current_user.id) if current_user else None
        )
        await movement.save()

        # Update item's current_stock
        item.current_stock = int(stock.current_stock)
        item.updated_at = datetime.utcnow()
        await item.save()

        return {
            "success": True,
            "issue_id": issue.issue_id,
            "message": f"Issued {data.quantity} units of {data.item_code}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating stock issue: {e}")
        raise HTTPException(status_code=500, detail=str(e))
