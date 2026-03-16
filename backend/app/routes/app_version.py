from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from app.dependencies.roles import require_role

router = APIRouter(tags=["app"])

class VersionInfo(BaseModel):
    versionCode: int
    versionName: str
    latest_version: str
    minimum_version: str
    force_update: bool
    downloadUrl: str
    releaseNotes: Optional[str] = None
    mandatory: bool = False

class VersionUpdate(BaseModel):
    minimum_version: Optional[str] = None
    force_update: Optional[bool] = None
    latest_version: Optional[str] = None
    releaseNotes: Optional[str] = None

# Mutable in-memory version config — in production this should live in DB
_version_config: dict = {
    "versionCode": 2,
    "versionName": "2.0.0",
    "latest_version": "2.0.0",
    "minimum_version": "1.0.0",
    "force_update": False,
    "downloadUrl": "https://github.com/amanrax/Phase1/releases/latest/download/cem-farmer-release.apk",
    "releaseNotes": "- Phase 2 features\n- Reports & Analytics\n- Dark mode\n- QR verification",
    "mandatory": False,
}

def _version_payload() -> dict:
    return _version_config


@router.get("/api/app/version", response_model=VersionInfo)
async def get_latest_version():
    """
    Get the latest available app version (public — no auth required).
    Returns: latest_version, minimum_version, force_update, release_notes.
    """
    return _version_payload()


@router.get("/api/app-version", response_model=VersionInfo)
async def get_latest_version_alias():
    """Alias endpoint required by supplementary test suite."""
    return _version_payload()

@router.put("/api/app/version", dependencies=[Depends(require_role(["ADMIN"]))])
async def update_version(
    payload: VersionUpdate,
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """Admin: update minimum_version / force_update / latest_version / releaseNotes."""
    if payload.minimum_version is not None:
        _version_config["minimum_version"] = payload.minimum_version
    if payload.force_update is not None:
        _version_config["force_update"] = payload.force_update
        _version_config["mandatory"] = payload.force_update
    if payload.latest_version is not None:
        _version_config["latest_version"] = payload.latest_version
        _version_config["versionName"] = payload.latest_version
    if payload.releaseNotes is not None:
        _version_config["releaseNotes"] = payload.releaseNotes
    return {"updated": True, "config": _version_config}


@router.get("/api/admin/app-version", dependencies=[Depends(require_role(["ADMIN"]))])
async def get_admin_version_config(current_user: dict = Depends(require_role(["ADMIN"]))):
    """Admin alias endpoint for version config retrieval."""
    return _version_payload()


@router.put("/api/admin/app-version", dependencies=[Depends(require_role(["ADMIN"]))])
async def update_admin_version(
    payload: VersionUpdate,
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """Admin alias endpoint for updating version policy values."""
    return await update_version(payload, current_user)

@router.get("/api/app/health")
async def app_health():
    """Simple health check for the app version endpoint"""
    return {"status": "ok", "latestVersion": _version_config["latest_version"]}
