from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/app", tags=["app"])

class VersionInfo(BaseModel):
    versionCode: int
    versionName: str
    downloadUrl: str
    releaseNotes: str | None = None
    mandatory: bool = False

# Update this after each release
LATEST_VERSION = VersionInfo(
    versionCode=2,
    versionName="1.0.1",
    downloadUrl="https://github.com/amanrax/Phase1/releases/latest/download/cem-farmer-release.apk",
    releaseNotes="- Fixed package name issues\n- Improved app stability\n- Bug fixes",
    mandatory=False
)

@router.get("/version", response_model=VersionInfo)
async def get_latest_version():
    """
    Get the latest available app version
    Mobile app will check this endpoint to see if updates are available
    """
    return LATEST_VERSION

@router.get("/health")
async def app_health():
    """Simple health check for the app version endpoint"""
    return {"status": "ok", "latestVersion": LATEST_VERSION.versionName}
