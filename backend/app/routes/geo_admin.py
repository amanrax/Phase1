# backend/app/routes/geo_admin.py
# Admin-only CRUD for provinces, districts, chiefdoms, ethnic groups.
# Uses soft deletes (is_active: false) — hard deletes are forbidden.
# Blocks deletion if any farmer references the entity.
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from app.database import get_db
from app.dependencies.roles import require_role

router = APIRouter(prefix="/admin/geo", tags=["Geo Admin"])

_ADMIN_ONLY = [Depends(require_role(["ADMIN"]))]


# ─── Request models ────────────────────────────────────────────────────────────

class ProvinceCreate(BaseModel):
    name: str = Field(..., min_length=1)
    code: Optional[str] = None


class ProvinceUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None


class DistrictCreate(BaseModel):
    name: str = Field(..., min_length=1)
    province_id: Optional[str] = None
    province_name: Optional[str] = None


class DistrictUpdate(BaseModel):
    name: Optional[str] = None
    province_id: Optional[str] = None
    province_name: Optional[str] = None


class ChiefdomCreate(BaseModel):
    name: str = Field(..., min_length=1)
    district_id: Optional[str] = None
    district_name: Optional[str] = None


class ChiefdomUpdate(BaseModel):
    name: Optional[str] = None
    district_id: Optional[str] = None
    district_name: Optional[str] = None


class EthnicGroupCreate(BaseModel):
    name: str = Field(..., min_length=1)


class EthnicGroupUpdate(BaseModel):
    name: Optional[str] = None


# ─── helpers ──────────────────────────────────────────────────────────────────

def _ts():
    return datetime.utcnow()


from bson import ObjectId as _OID


import math as _math


def _serialize(doc: dict) -> dict:
    """Recursively convert ObjectId→str and NaN/Inf floats→None for JSON safety."""
    result = {}
    for k, v in doc.items():
        if isinstance(v, _OID):
            result[k] = str(v)
        elif isinstance(v, float) and not _math.isfinite(v):
            result[k] = None  # NaN / Inf from CSV imports
        else:
            result[k] = v
    return result


# ── Per-collection normalizers ─────────────────────────────────────────────────
# The DB uses province_name/province_code, district_name, chiefdom_name.
# The admin UI expects a uniform {name, code} shape, so we map here.
# We also keep the original field in the doc so public geo.py routes still work.

def _norm_province(doc: dict) -> dict:
    doc = _serialize(doc)
    if "name" not in doc or not doc["name"]:
        doc["name"] = doc.get("province_name", "")
    if "code" not in doc:
        doc["code"] = doc.get("province_code")
    return doc


def _norm_district(doc: dict) -> dict:
    doc = _serialize(doc)
    if "name" not in doc or not doc["name"]:
        doc["name"] = doc.get("district_name", "")
    return doc


def _norm_chiefdom(doc: dict) -> dict:
    doc = _serialize(doc)
    if "name" not in doc or not doc["name"]:
        # DB stores chief_name (e.g. "Chief Banda"); fall back to chiefdom_name
        doc["name"] = doc.get("chief_name") or doc.get("chiefdom_name", "")
    return doc


def _norm_ethnic(doc: dict) -> dict:
    doc = _serialize(doc)
    return doc


async def _count_farmer_refs(db, field: str, value: str) -> int:
    """Count active farmers that reference an entity by name."""
    return await db.farmers.count_documents({"address." + field: value, "is_active": True})


# ─── PROVINCES ────────────────────────────────────────────────────────────────

@router.get("/provinces", dependencies=_ADMIN_ONLY)
async def list_provinces_admin(
    include_inactive: bool = Query(False),
    db=Depends(get_db),
):
    flt = {} if include_inactive else {"is_active": {"$ne": False}}
    # Sort by whichever name field exists in the collection
    docs = await db.provinces.find(flt).sort("province_name", 1).to_list(500)
    return [_norm_province(d) for d in docs]


@router.post("/provinces", dependencies=_ADMIN_ONLY, status_code=status.HTTP_201_CREATED)
async def create_province(body: ProvinceCreate, db=Depends(get_db)):
    existing = await db.provinces.find_one(
        {"$or": [{"province_name": body.name}, {"name": body.name}]}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Province already exists")
    doc = {
        "name": body.name,
        "province_name": body.name,   # keeps compatibility with geo.py public routes
        "code": body.code,
        "province_code": body.code or "",
        "is_active": True,
        "created_at": _ts(),
    }
    result = await db.provinces.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@router.put("/provinces/{province_id}", dependencies=_ADMIN_ONLY)
async def update_province(province_id: str, body: ProvinceUpdate, db=Depends(get_db)):
    from bson import ObjectId
    try:
        oid = ObjectId(province_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid province_id")
    updates: dict = {}
    if body.name is not None:
        updates["name"] = body.name
        updates["province_name"] = body.name
    if body.code is not None:
        updates["code"] = body.code
        updates["province_code"] = body.code
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates["updated_at"] = _ts()
    result = await db.provinces.update_one({"_id": oid}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Province not found")
    return {"message": "Updated", "province_id": province_id}


@router.delete("/provinces/{province_id}", dependencies=_ADMIN_ONLY)
async def soft_delete_province(province_id: str, db=Depends(get_db)):
    from bson import ObjectId
    try:
        oid = ObjectId(province_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid province_id")
    doc = await db.provinces.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Province not found")
    name = doc.get("province_name") or doc.get("name", "")
    refs = await _count_farmer_refs(db, "province_name", name)
    if refs > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete: {refs} active farmer(s) reference this province.",
        )
    await db.provinces.update_one({"_id": oid}, {"$set": {"is_active": False, "updated_at": _ts()}})
    return {"message": "Province deactivated (soft delete)", "province_id": province_id}


# ─── DISTRICTS ────────────────────────────────────────────────────────────────

@router.get("/districts", dependencies=_ADMIN_ONLY)
async def list_districts_admin(
    province_name: Optional[str] = Query(None),
    include_inactive: bool = Query(False),
    db=Depends(get_db),
):
    flt: dict = {} if include_inactive else {"is_active": {"$ne": False}}
    if province_name:
        flt["province_name"] = province_name
    docs = await db.districts.find(flt).sort("district_name", 1).to_list(1000)
    return [_norm_district(d) for d in docs]


@router.post("/districts", dependencies=_ADMIN_ONLY, status_code=status.HTTP_201_CREATED)
async def create_district(body: DistrictCreate, db=Depends(get_db)):
    existing = await db.districts.find_one(
        {"$or": [{"district_name": body.name}, {"name": body.name}],
         "province_name": body.province_name}
    )
    if existing:
        raise HTTPException(status_code=400, detail="District already exists in this province")
    doc = {
        "name": body.name,
        "district_name": body.name,   # keeps compatibility with geo.py public routes
        "province_name": body.province_name or "",
        "is_active": True,
        "created_at": _ts(),
    }
    result = await db.districts.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@router.put("/districts/{district_id}", dependencies=_ADMIN_ONLY)
async def update_district(district_id: str, body: DistrictUpdate, db=Depends(get_db)):
    from bson import ObjectId
    try:
        oid = ObjectId(district_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid district_id")
    updates: dict = {}
    if body.name is not None:
        updates["name"] = body.name
        updates["district_name"] = body.name
    if body.province_name is not None:
        updates["province_name"] = body.province_name
    if body.province_id is not None:
        updates["province_id"] = body.province_id
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates["updated_at"] = _ts()
    result = await db.districts.update_one({"_id": oid}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="District not found")
    return {"message": "Updated", "district_id": district_id}


@router.delete("/districts/{district_id}", dependencies=_ADMIN_ONLY)
async def soft_delete_district(district_id: str, db=Depends(get_db)):
    from bson import ObjectId
    try:
        oid = ObjectId(district_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid district_id")
    doc = await db.districts.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="District not found")
    name = doc.get("district_name") or doc.get("name", "")
    refs = await _count_farmer_refs(db, "district_name", name)
    if refs > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete: {refs} active farmer(s) reference this district.",
        )
    await db.districts.update_one({"_id": oid}, {"$set": {"is_active": False, "updated_at": _ts()}})
    return {"message": "District deactivated (soft delete)", "district_id": district_id}


# ─── CHIEFDOMS ────────────────────────────────────────────────────────────────

@router.get("/chiefdoms", dependencies=_ADMIN_ONLY)
async def list_chiefdoms_admin(
    district_name: Optional[str] = Query(None),
    include_inactive: bool = Query(False),
    db=Depends(get_db),
):
    flt: dict = {} if include_inactive else {"is_active": {"$ne": False}}
    if district_name:
        flt["district_name"] = district_name
    docs = await db.chiefdoms.find(flt).sort("chief_name", 1).to_list(2000)
    return [_norm_chiefdom(d) for d in docs]


@router.post("/chiefdoms", dependencies=_ADMIN_ONLY, status_code=status.HTTP_201_CREATED)
async def create_chiefdom(body: ChiefdomCreate, db=Depends(get_db)):
    existing = await db.chiefdoms.find_one(
        {"$or": [{"chiefdom_name": body.name}, {"name": body.name}],
         "district_name": body.district_name}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Chiefdom already exists in this district")
    doc = {
        "name": body.name,
        "chiefdom_name": body.name,   # keeps compatibility with geo.py public routes
        "district_name": body.district_name or "",
        "is_active": True,
        "created_at": _ts(),
    }
    result = await db.chiefdoms.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@router.put("/chiefdoms/{chiefdom_id}", dependencies=_ADMIN_ONLY)
async def update_chiefdom(chiefdom_id: str, body: ChiefdomUpdate, db=Depends(get_db)):
    from bson import ObjectId
    try:
        oid = ObjectId(chiefdom_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid chiefdom_id")
    updates: dict = {}
    if body.name is not None:
        updates["name"] = body.name
        updates["chiefdom_name"] = body.name
    if body.district_name is not None:
        updates["district_name"] = body.district_name
    if body.district_id is not None:
        updates["district_id"] = body.district_id
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates["updated_at"] = _ts()
    result = await db.chiefdoms.update_one({"_id": oid}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Chiefdom not found")
    return {"message": "Updated", "chiefdom_id": chiefdom_id}


@router.delete("/chiefdoms/{chiefdom_id}", dependencies=_ADMIN_ONLY)
async def soft_delete_chiefdom(chiefdom_id: str, db=Depends(get_db)):
    from bson import ObjectId
    try:
        oid = ObjectId(chiefdom_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid chiefdom_id")
    doc = await db.chiefdoms.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Chiefdom not found")
    name = doc.get("chiefdom_name") or doc.get("name", "")
    refs = await _count_farmer_refs(db, "chiefdom_name", name)
    if refs > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete: {refs} active farmer(s) reference this chiefdom.",
        )
    await db.chiefdoms.update_one({"_id": oid}, {"$set": {"is_active": False, "updated_at": _ts()}})
    return {"message": "Chiefdom deactivated (soft delete)", "chiefdom_id": chiefdom_id}


# ─── ETHNIC GROUPS ────────────────────────────────────────────────────────────

@router.get("/ethnic-groups", dependencies=_ADMIN_ONLY)
async def list_ethnic_groups_admin(
    include_inactive: bool = Query(False),
    db=Depends(get_db),
):
    flt = {} if include_inactive else {"is_active": {"$ne": False}}
    docs = await db.ethnic_groups.find(flt).sort("name", 1).to_list(500)
    return [_norm_ethnic(d) for d in docs]


@router.post("/ethnic-groups", dependencies=_ADMIN_ONLY, status_code=status.HTTP_201_CREATED)
async def create_ethnic_group(body: EthnicGroupCreate, db=Depends(get_db)):
    existing = await db.ethnic_groups.find_one({"name": body.name})
    if existing:
        raise HTTPException(status_code=400, detail="Ethnic group already exists")
    doc = {**body.model_dump(), "is_active": True, "created_at": _ts()}
    result = await db.ethnic_groups.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@router.put("/ethnic-groups/{group_id}", dependencies=_ADMIN_ONLY)
async def update_ethnic_group(group_id: str, body: EthnicGroupUpdate, db=Depends(get_db)):
    from bson import ObjectId
    try:
        oid = ObjectId(group_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid group_id")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates["updated_at"] = _ts()
    result = await db.ethnic_groups.update_one({"_id": oid}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ethnic group not found")
    return {"message": "Updated", "group_id": group_id}


@router.delete("/ethnic-groups/{group_id}", dependencies=_ADMIN_ONLY)
async def soft_delete_ethnic_group(group_id: str, db=Depends(get_db)):
    from bson import ObjectId
    try:
        oid = ObjectId(group_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid group_id")
    doc = await db.ethnic_groups.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Ethnic group not found")
    refs = await db.farmers.count_documents(
        {"personal_info.ethnic_group": doc.get("name", ""), "is_active": True}
    )
    if refs > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete: {refs} active farmer(s) reference this ethnic group.",
        )
    await db.ethnic_groups.update_one({"_id": oid}, {"$set": {"is_active": False, "updated_at": _ts()}})
    return {"message": "Ethnic group deactivated (soft delete)", "group_id": group_id}
