# backend/app/routes/reference_data.py
# Livestock and crop reference data — public GET, admin-only POST
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import Literal
from app.database import get_db
from app.dependencies.roles import require_role

router = APIRouter(prefix="/reference-data", tags=["Reference Data"])

VALID_TYPES = {"livestock", "crops"}

# Default seed values (inserted on first GET if collection is empty for that type)
_DEFAULTS = {
    "livestock": [
        "cattle", "goats", "sheep", "pigs", "chickens", "ducks", "rabbits",
    ],
    "crops": [
        "maize", "sorghum", "groundnuts", "soybean", "sunflower", "cotton",
        "cassava", "sweet potato", "vegetables", "tobacco", "wheat", "rice",
        "millet", "beans",
    ],
}


class ReferenceDataCreate(BaseModel):
    name: str = Field(..., min_length=1)
    type: Literal["livestock", "crops"]


async def _ensure_seeded(db, ref_type: str):
    """Seed defaults for a type if the collection is empty for that type."""
    count = await db.reference_data.count_documents({"type": ref_type})
    if count == 0:
        now = datetime.utcnow()
        docs = [
            {"name": name, "type": ref_type, "is_active": True, "created_at": now}
            for name in _DEFAULTS.get(ref_type, [])
        ]
        if docs:
            await db.reference_data.insert_many(docs)


@router.get(
    "",
    summary="List livestock or crop reference entries",
    description="Public endpoint. Pass ?type=livestock or ?type=crops",
)
async def list_reference_data(
    type: str = Query(..., description="livestock or crops"),
    db=Depends(get_db),
):
    if type not in VALID_TYPES:
        raise HTTPException(status_code=400, detail="type must be 'livestock' or 'crops'")
    await _ensure_seeded(db, type)
    docs = await db.reference_data.find(
        {"type": type, "is_active": {"$ne": False}},
        {"_id": 0, "name": 1, "type": 1},
    ).sort("name", 1).to_list(500)
    return docs


@router.post(
    "",
    summary="Add a new reference data entry (admin only)",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(["ADMIN"]))],
)
async def create_reference_data(body: ReferenceDataCreate, db=Depends(get_db)):
    existing = await db.reference_data.find_one({"name": body.name, "type": body.type})
    if existing:
        # If it was soft-deleted, reactivate it
        if not existing.get("is_active", True):
            await db.reference_data.update_one(
                {"name": body.name, "type": body.type},
                {"$set": {"is_active": True, "updated_at": datetime.utcnow()}},
            )
            return {"name": body.name, "type": body.type, "status": "reactivated"}
        raise HTTPException(status_code=400, detail="Entry already exists")

    doc = {**body.model_dump(), "is_active": True, "created_at": datetime.utcnow()}
    await db.reference_data.insert_one(doc)
    return {"name": body.name, "type": body.type, "status": "created"}


@router.post(
    "/upsert",
    summary="Add a custom entry if it doesn't already exist (any auth)",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role(["ADMIN", "OPERATOR", "FARMER"]))],
)
async def upsert_reference_entry(body: ReferenceDataCreate, db=Depends(get_db)):
    """
    When a farmer selects a custom entry not in the list, save it to reference_data
    so future farmers see it as an option.
    """
    existing = await db.reference_data.find_one({"name": body.name, "type": body.type})
    if existing and existing.get("is_active", True):
        return {"name": body.name, "type": body.type, "status": "exists"}

    if existing:
        await db.reference_data.update_one(
            {"name": body.name, "type": body.type},
            {"$set": {"is_active": True, "updated_at": datetime.utcnow()}},
        )
    else:
        doc = {**body.model_dump(), "is_active": True, "created_at": datetime.utcnow()}
        await db.reference_data.insert_one(doc)

    return {"name": body.name, "type": body.type, "status": "created"}
