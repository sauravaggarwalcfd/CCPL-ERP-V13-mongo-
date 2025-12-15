#!/usr/bin/env python3
"""Check user in users collection"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check_users():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["inventory_erp"]
    
    print("📊 Users in database:")
    users = await db["users"].find({}).to_list(10)
    for user in users:
        print(f"\n   Email: {user.get('email')}")
        print(f"   Full Name: {user.get('full_name')}")
        print(f"   Status: {user.get('status')}")
        print(f"   Password Hash: {user.get('password_hash', 'N/A')[:50]}...")
    
    if not users:
        print("   (No users found)")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_users())
