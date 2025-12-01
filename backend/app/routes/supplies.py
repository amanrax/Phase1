# backend/app/routes/supplies.py
from fastapi import APIRouter, Depends, HTTPException, status
from app.database import get_db
from app.dependencies.roles import require_role
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel

router = APIRouter(prefix="/supplies", tags=["Supply Requests"])


class SupplyRequestCreate(BaseModel):
    items: List[str]
    quantity: str
    urgency: str  # low, medium, high
    notes: Optional[str] = None


class SupplyRequestUpdate(BaseModel):
    status: str  # pending, approved, rejected, fulfilled
    admin_notes: Optional[str] = None


@router.post("/request", dependencies=[Depends(require_role(["FARMER"]))])
async def create_supply_request(
    request_data: SupplyRequestCreate,
    current_user: dict = Depends(require_role(["FARMER"])),
    db = Depends(get_db)
):
    """
    Create a new supply request (Farmer only)
    """
    # Get farmer details
    farmer = await db.farmers.find_one({"personal_info.email": current_user.get("email")})
    
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer profile not found")
    
    # Create supply request
    supply_request = {
        "farmer_id": farmer.get("farmer_id"),
        "farmer_email": current_user.get("email"),
        "farmer_name": f"{farmer.get('personal_info', {}).get('first_name', '')} {farmer.get('personal_info', {}).get('last_name', '')}".strip(),
        "items": request_data.items,
        "quantity": request_data.quantity,
        "urgency": request_data.urgency,
        "notes": request_data.notes,
        "status": "pending",
        "admin_notes": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = await db.supply_requests.insert_one(supply_request)
    supply_request["_id"] = str(result.inserted_id)
    
    return {
        "message": "Supply request created successfully",
        "request_id": str(result.inserted_id),
        "request": supply_request
    }


@router.get("/my-requests", dependencies=[Depends(require_role(["FARMER"]))])
async def get_my_supply_requests(
    current_user: dict = Depends(require_role(["FARMER"])),
    db = Depends(get_db)
):
    """
    Get all supply requests for the current farmer
    """
    requests = await db.supply_requests.find(
        {"farmer_email": current_user.get("email")}
    ).sort("created_at", -1).to_list(length=100)
    
    # Format response
    formatted_requests = []
    for req in requests:
        formatted_requests.append({
            "id": str(req.get("_id")),
            "farmer_id": req.get("farmer_id"),
            "farmer_name": req.get("farmer_name"),
            "items": req.get("items", []),
            "quantity": req.get("quantity"),
            "urgency": req.get("urgency"),
            "notes": req.get("notes"),
            "status": req.get("status"),
            "admin_notes": req.get("admin_notes"),
            "created_at": req.get("created_at").isoformat() if req.get("created_at") else None,
            "updated_at": req.get("updated_at").isoformat() if req.get("updated_at") else None
        })
    
    return {"requests": formatted_requests, "total": len(formatted_requests)}


@router.get("/all", dependencies=[Depends(require_role(["ADMIN"]))])
async def get_all_supply_requests(
    status: Optional[str] = None,
    db = Depends(get_db)
):
    """
    Get all supply requests (Admin only)
    """
    query = {}
    if status:
        query["status"] = status
    
    requests = await db.supply_requests.find(query).sort("created_at", -1).to_list(length=500)
    
    # Format response
    formatted_requests = []
    for req in requests:
        formatted_requests.append({
            "id": str(req.get("_id")),
            "farmer_id": req.get("farmer_id"),
            "farmer_email": req.get("farmer_email"),
            "farmer_name": req.get("farmer_name"),
            "items": req.get("items", []),
            "quantity": req.get("quantity"),
            "urgency": req.get("urgency"),
            "notes": req.get("notes"),
            "status": req.get("status"),
            "admin_notes": req.get("admin_notes"),
            "created_at": req.get("created_at").isoformat() if req.get("created_at") else None,
            "updated_at": req.get("updated_at").isoformat() if req.get("updated_at") else None
        })
    
    return {"requests": formatted_requests, "total": len(formatted_requests)}


@router.patch("/{request_id}", dependencies=[Depends(require_role(["ADMIN"]))])
async def update_supply_request(
    request_id: str,
    update_data: SupplyRequestUpdate,
    db = Depends(get_db)
):
    """
    Update supply request status (Admin only)
    """
    from bson import ObjectId
    
    try:
        object_id = ObjectId(request_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid request ID")
    
    request = await db.supply_requests.find_one({"_id": object_id})
    if not request:
        raise HTTPException(status_code=404, detail="Supply request not found")
    
    update_fields = {
        "status": update_data.status,
        "updated_at": datetime.now(timezone.utc)
    }
    
    if update_data.admin_notes:
        update_fields["admin_notes"] = update_data.admin_notes
    
    result = await db.supply_requests.update_one(
        {"_id": object_id},
        {"$set": update_fields}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to update supply request")
    
    return {"message": "Supply request updated successfully", "request_id": request_id}


@router.delete("/{request_id}", dependencies=[Depends(require_role(["ADMIN"]))])
async def delete_supply_request(
    request_id: str,
    db = Depends(get_db)
):
    """
    Delete supply request (Admin only)
    """
    from bson import ObjectId
    
    try:
        object_id = ObjectId(request_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid request ID")
    
    result = await db.supply_requests.delete_one({"_id": object_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Supply request not found")
    
    return {"message": "Supply request deleted successfully"}
