#!/usr/bin/env python
import asyncio
from backend.app.database import connect_to_mongo, close_mongo_connection
from backend.app.models.purchase_order import PurchaseOrder
import json

async def main():
    await connect_to_mongo()
    
    # Get first PO
    po = await PurchaseOrder.find_one()
    
    if po:
        print(f"Found PO: {po.po_number}")
        print(f"Supplier: {po.supplier}")
        print(f"Supplier dict: {po.supplier.dict()}")
        print("\nFull PO response format:")
        response = {
            "id": str(po.id),
            "po_number": po.po_number,
            "po_version": po.po_version,
            "po_date": po.po_date,
            "po_status": po.po_status,
            "supplier": po.supplier.dict(),
            "tracking": po.tracking.dict(),
            "summary": po.summary.dict(),
            "delivery": po.delivery.dict(),
            "payment": po.payment.dict(),
        }
        print(json.dumps(response, indent=2, default=str))
    else:
        print("No POs found in database")
    
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(main())
