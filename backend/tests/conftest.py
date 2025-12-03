"""
Pytest configuration and fixtures for backend testing.
"""
import pytest
import asyncio
from typing import AsyncGenerator, Generator
from motor.motor_asyncio import AsyncIOMotorClient
from httpx import AsyncClient
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.utils.security import create_access_token, hash_password


# Test database name
TEST_DB_NAME = f"{settings.MONGODB_DB_NAME}_test"


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_db():
    """Create test database connection."""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[TEST_DB_NAME]
    yield db
    # Cleanup: drop test database after all tests
    await client.drop_database(TEST_DB_NAME)
    client.close()


@pytest.fixture(scope="function")
async def clean_db(test_db):
    """Clean database before each test."""
    # Drop all collections
    collections = await test_db.list_collection_names()
    for collection in collections:
        await test_db[collection].delete_many({})
    yield test_db


@pytest.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Create async HTTP client for testing."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


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
def admin_token(admin_user):
    """Generate admin JWT token."""
    return create_access_token(admin_user["email"], roles=admin_user["roles"])


@pytest.fixture
def operator_token(operator_user):
    """Generate operator JWT token."""
    return create_access_token(operator_user["email"], roles=operator_user["roles"])


@pytest.fixture
def farmer_token(farmer_user):
    """Generate farmer JWT token."""
    return create_access_token(farmer_user["farmer_id"], roles=["FARMER"])


@pytest.fixture
def auth_headers_admin(admin_token):
    """Get authorization headers for admin."""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def auth_headers_operator(operator_token):
    """Get authorization headers for operator."""
    return {"Authorization": f"Bearer {operator_token}"}


@pytest.fixture
def auth_headers_farmer(farmer_token):
    """Get authorization headers for farmer."""
    return {"Authorization": f"Bearer {farmer_token}"}
