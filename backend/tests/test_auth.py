"""
Tests for authentication endpoints and role-based login validation.
"""
import pytest
from httpx import AsyncClient


class TestAuthLogin:
    """Test login endpoint with role validation."""
    
    @pytest.mark.asyncio
    async def test_admin_login_success(self, async_client: AsyncClient, admin_user):
        """Test successful admin login."""
        response = await async_client.post(
            "/api/auth/login",
            json={
                "email": "test_admin@test.com",
                "password": "admin123",
                "role": "admin"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["roles"] == ["ADMIN"]
    
    @pytest.mark.asyncio
    async def test_operator_login_success(self, async_client: AsyncClient, operator_user):
        """Test successful operator login."""
        response = await async_client.post(
            "/api/auth/login",
            json={
                "email": "test_operator@test.com",
                "password": "operator123",
                "role": "operator"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "OPERATOR" in data["user"]["roles"]
    
    @pytest.mark.asyncio
    async def test_farmer_login_with_nrc(self, async_client: AsyncClient, farmer_user):
        """Test farmer login with NRC and DOB."""
        response = await async_client.post(
            "/api/auth/login",
            json={
                "email": "123456/12/1",  # NRC
                "password": "1990-01-15",  # DOB
                "role": "farmer"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["roles"] == ["FARMER"]
    
    @pytest.mark.asyncio
    async def test_role_mismatch_admin_as_operator(self, async_client: AsyncClient, admin_user):
        """Test role validation: admin credentials with operator role selected."""
        response = await async_client.post(
            "/api/auth/login",
            json={
                "email": "test_admin@test.com",
                "password": "admin123",
                "role": "operator"  # Wrong role
            }
        )
        assert response.status_code == 401
        assert "Invalid credentials for operator login" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_role_mismatch_operator_as_admin(self, async_client: AsyncClient, operator_user):
        """Test role validation: operator credentials with admin role selected."""
        response = await async_client.post(
            "/api/auth/login",
            json={
                "email": "test_operator@test.com",
                "password": "operator123",
                "role": "admin"  # Wrong role
            }
        )
        assert response.status_code == 401
        assert "Invalid credentials for admin login" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_invalid_credentials(self, async_client: AsyncClient):
        """Test login with invalid credentials."""
        response = await async_client.post(
            "/api/auth/login",
            json={
                "email": "nonexistent@test.com",
                "password": "wrongpass"
            }
        )
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_inactive_user_blocked(self, async_client: AsyncClient, clean_db):
        """Test that inactive users cannot login."""
        from app.utils.security import hash_password
        
        # Create inactive user
        await clean_db.users.insert_one({
            "email": "inactive@test.com",
            "password_hash": hash_password("pass123"),
            "roles": ["OPERATOR"],
            "is_active": False
        })
        
        response = await async_client.post(
            "/api/auth/login",
            json={
                "email": "inactive@test.com",
                "password": "pass123"
            }
        )
        assert response.status_code == 403
        assert "disabled" in response.json()["detail"].lower()


class TestTokenRefresh:
    """Test token refresh functionality."""
    
    @pytest.mark.asyncio
    async def test_refresh_token_success(self, async_client: AsyncClient, admin_user):
        """Test successful token refresh."""
        # Login first to get refresh token
        login_response = await async_client.post(
            "/api/auth/login",
            json={
                "email": "test_admin@test.com",
                "password": "admin123"
            }
        )
        refresh_token = login_response.json().get("refresh_token")
        
        if refresh_token:
            # Attempt refresh
            response = await async_client.post(
                "/api/auth/refresh",
                json={"refresh_token": refresh_token}
            )
            assert response.status_code == 200
            assert "access_token" in response.json()
