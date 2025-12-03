"""
Pytest configuration and fixtures for backend testing.
"""
import pytest
import asyncio
from typing import AsyncGenerator, Generator
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from httpx import AsyncClient, ASGITransport
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.database import get_db
from app.utils.security import create_access_token, hash_password


# Test database name
TEST_DB_NAME = f"{settings.MONGODB_DB_NAME}_test"
test_client = None
test_database = None


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_mongo_client():
    """Create MongoDB client for tests."""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    yield client
    await client.drop_database(TEST_DB_NAME)
    client.close()


@pytest.fixture(scope="function")
async def test_db(test_mongo_client):
    """Create test database connection and clean it."""
    db = test_mongo_client[TEST_DB_NAME]
    # Clean all collections before test
    collections = await db.list_collection_names()
    for collection in collections:
        await db[collection].delete_many({})
    yield db


@pytest.fixture(scope="function")
async def clean_db(test_db):
    """Alias for test_db for backward compatibility."""
    return test_db


async def override_get_db():
    """Override database dependency for tests."""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[TEST_DB_NAME]
    try:
        yield db
    finally:
        pass  # Don't close here as we manage it in fixtures


@pytest.fixture
async def async_client(test_db) -> AsyncGenerator[AsyncClient, None]:
    """Create async HTTP client for testing."""
    # Override the database dependency
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client
    
    # Clear overrides after test
    app.dependency_overrides.clear()


@pytest.fixture
def sync_client() -> Generator[TestClient, None, None]:
    """Create synchronous HTTP client for testing."""
    with TestClient(app) as client:
        yield client


@pytest.fixture
async def admin_user(clean_db):
    """Create test admin user."""
    admin_data = {
        "email": "test_admin@test.com",
        "password_hash": hash_password("admin123"),
        "roles": ["ADMIN"],
        "is_active": True,
        "full_name": "Test Admin",
        "phone": "+260123456789"
    }
    result = await clean_db.users.insert_one(admin_data)
    admin_data["_id"] = result.inserted_id
    return admin_data


@pytest.fixture
async def operator_user(clean_db):
    """Create test operator user."""
    operator_data = {
        "email": "test_operator@test.com",
        "password_hash": hash_password("operator123"),
        "roles": ["OPERATOR"],
        "is_active": True,
        "full_name": "Test Operator",
        "phone": "+260987654321",
        "assigned_districts": ["Lusaka"]
    }
    result = await clean_db.users.insert_one(operator_data)
    operator_data["_id"] = result.inserted_id
    return operator_data


@pytest.fixture
async def farmer_user(clean_db):
    """Create test farmer."""
    farmer_data = {
        "farmer_id": "ZM000TEST1",
        "personal_info": {
            "first_name": "Test",
            "last_name": "Farmer",
            "nrc": "123456/12/1",
            "date_of_birth": "1990-01-15",
            "phone_primary": "+260111222333",
            "email": "farmer@test.com"
        },
        "is_active": True,
        "registration_status": "registered"
    }
    result = await clean_db.farmers.insert_one(farmer_data)
    farmer_data["_id"] = result.inserted_id
    return farmer_data


@pytest.fixture
async def admin_token(admin_user):
    """Generate admin JWT token."""
    user = await admin_user if asyncio.iscoroutine(admin_user) else admin_user
    return create_access_token(user["email"], roles=user["roles"])


@pytest.fixture
async def operator_token(operator_user):
    """Generate operator JWT token."""
    user = await operator_user if asyncio.iscoroutine(operator_user) else operator_user
    return create_access_token(user["email"], roles=user["roles"])


@pytest.fixture
async def farmer_token(farmer_user):
    """Generate farmer JWT token."""
    user = await farmer_user if asyncio.iscoroutine(farmer_user) else farmer_user
    return create_access_token(user["farmer_id"], roles=["FARMER"])


@pytest.fixture
async def auth_headers_admin(admin_token):
    """Get authorization headers for admin."""
    token = await admin_token if asyncio.iscoroutine(admin_token) else admin_token
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def auth_headers_operator(operator_token):
    """Get authorization headers for operator."""
    token = await operator_token if asyncio.iscoroutine(operator_token) else operator_token
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def auth_headers_farmer(farmer_token):
    """Get authorization headers for farmer."""
    token = await farmer_token if asyncio.iscoroutine(farmer_token) else farmer_token
    return {"Authorization": f"Bearer {token}"}
