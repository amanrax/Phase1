# backend/app/routes/ethnic_groups.py
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.database import get_db_motor
from app.models.ethnic_group import (
    EthnicGroupCreate,
    EthnicGroupUpdate,
    EthnicGroupResponse,
)
from app.services.ethnic_group_service import EthnicGroupService
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter(prefix="/ethnic-groups", tags=["ethnic-groups"])


async def get_ethnic_group_service(db: AsyncIOMotorDatabase = Depends(get_db_motor)) -> EthnicGroupService:
    """Dependency to get EthnicGroupService instance"""
    return EthnicGroupService(db)


@router.get("", response_model=List[EthnicGroupResponse])
async def list_ethnic_groups(
    active_only: bool = True,
    service: EthnicGroupService = Depends(get_ethnic_group_service),
):
    """
    Get all ethnic groups
    
    Query Parameters:
    - active_only: If True, only return active ethnic groups (default: True)
    
    Returns:
    - List of ethnic group objects
    """
    groups = await service.get_all(active_only=active_only)
    return [
        EthnicGroupResponse(
            _id=str(g["_id"]),
            name=g["name"],
            is_active=g["is_active"],
            created_at=g.get("created_at"),
            updated_at=g.get("updated_at"),
        )
        for g in groups
    ]


@router.get("/{ethnic_group_id}", response_model=EthnicGroupResponse)
async def get_ethnic_group(
    ethnic_group_id: str,
    service: EthnicGroupService = Depends(get_ethnic_group_service),
):
    """Get a specific ethnic group by ID"""
    group = await service.get_by_id(ethnic_group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Ethnic group not found")
    
    return EthnicGroupResponse(
        _id=str(group["_id"]),
        name=group["name"],
        is_active=group["is_active"],
        created_at=group.get("created_at"),
        updated_at=group.get("updated_at"),
    )


@router.post("", response_model=EthnicGroupResponse, status_code=status.HTTP_201_CREATED)
async def create_ethnic_group(
    data: EthnicGroupCreate,
    service: EthnicGroupService = Depends(get_ethnic_group_service),
):
    """
    Create a new ethnic group
    
    Body:
    - name: Ethnic group name (required, 1-100 characters)
    - is_active: Whether the ethnic group is active (optional, default: true)
    
    Returns:
    - Created ethnic group object
    """
    try:
        group = await service.create(data)
        return EthnicGroupResponse(
            _id=str(group["_id"]),
            name=group["name"],
            is_active=group["is_active"],
            created_at=group.get("created_at"),
            updated_at=group.get("updated_at"),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.put("/{ethnic_group_id}", response_model=EthnicGroupResponse)
async def update_ethnic_group(
    ethnic_group_id: str,
    data: EthnicGroupUpdate,
    service: EthnicGroupService = Depends(get_ethnic_group_service),
):
    """
    Update an ethnic group
    
    Body:
    - name: New ethnic group name (optional)
    - is_active: Whether the ethnic group is active (optional)
    
    Returns:
    - Updated ethnic group object
    """
    group = await service.update(ethnic_group_id, data)
    if not group:
        raise HTTPException(status_code=404, detail="Ethnic group not found")
    
    return EthnicGroupResponse(
        _id=str(group["_id"]),
        name=group["name"],
        is_active=group["is_active"],
        created_at=group.get("created_at"),
        updated_at=group.get("updated_at"),
    )


@router.delete("/{ethnic_group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ethnic_group(
    ethnic_group_id: str,
    service: EthnicGroupService = Depends(get_ethnic_group_service),
):
    """Delete (deactivate) an ethnic group"""
    success = await service.delete(ethnic_group_id)
    if not success:
        raise HTTPException(status_code=404, detail="Ethnic group not found")
    
    return None
