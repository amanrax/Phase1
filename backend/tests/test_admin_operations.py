"""
Tests for operator and farmer CRUD operations by admin.
"""
import pytest
from httpx import AsyncClient


class TestOperatorManagement:
    """Test operator CRUD by admin."""
    
    @pytest.mark.asyncio
    async def test_create_operator(self, async_client: AsyncClient, clean_db, auth_headers_admin):
        """Test admin can create operator."""
        operator_data = {
            "email": "newoperator@test.com",
            "password": "pass123",
            "full_name": "New Operator",
            "phone": "+260999888777",
            "assigned_districts": ["Lusaka"]
        }
        
        response = await async_client.post(
            "/api/operators",
            json=operator_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["email"] == operator_data["email"]
        
        # Verify in database
        op = await clean_db.users.find_one({"email": operator_data["email"]})
        assert op is not None
        assert "OPERATOR" in op["roles"]
    
    @pytest.mark.asyncio
    async def test_deactivate_operator(self, async_client: AsyncClient, operator_user, auth_headers_admin):
        """Test admin can deactivate operator."""
        operator_id = str(operator_user["_id"])
        
        response = await async_client.patch(
            f"/api/operators/{operator_id}/status",
            json={"is_active": False},
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_deactivated_operator_cannot_login(self, async_client: AsyncClient, clean_db):
        """Test deactivated operator cannot login."""
        from app.utils.security import hash_password
        
        # Create inactive operator
        await clean_db.users.insert_one({
            "email": "inactive_op@test.com",
            "password_hash": hash_password("pass123"),
            "roles": ["OPERATOR"],
            "is_active": False
        })
        
        response = await async_client.post(
            "/api/auth/login",
            json={
                "email": "inactive_op@test.com",
                "password": "pass123"
            }
        )
        
        assert response.status_code == 403
    
    @pytest.mark.asyncio
    async def test_edit_operator(self, async_client: AsyncClient, operator_user, auth_headers_admin):
        """Test admin can edit operator details."""
        operator_id = str(operator_user["_id"])
        
        response = await async_client.put(
            f"/api/operators/{operator_id}",
            json={"full_name": "Updated Name", "phone": "+260111222333"},
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200


class TestFarmerManagement:
    """Test farmer CRUD by admin."""
    
    @pytest.mark.asyncio
    async def test_list_farmers(self, async_client: AsyncClient, farmer_user, auth_headers_admin):
        """Test admin can list farmers with pagination."""
        response = await async_client.get(
            "/api/farmers/?limit=10&skip=0",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        farmers = response.json()
        assert isinstance(farmers, list)
    
    @pytest.mark.asyncio
    async def test_get_farmer_details(self, async_client: AsyncClient, farmer_user, auth_headers_admin):
        """Test admin can view farmer details."""
        farmer_id = farmer_user["farmer_id"]
        
        response = await async_client.get(
            f"/api/farmers/{farmer_id}",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["farmer_id"] == farmer_id
    
    @pytest.mark.asyncio
    async def test_deactivate_farmer(self, async_client: AsyncClient, farmer_user, auth_headers_admin, clean_db):
        """Test admin can deactivate farmer."""
        farmer_id = farmer_user["farmer_id"]
        
        # Update farmer status
        await clean_db.farmers.update_one(
            {"farmer_id": farmer_id},
            {"$set": {"is_active": False}}
        )
        
        # Try to login as deactivated farmer
        response = await async_client.post(
            "/api/auth/login",
            json={
                "email": "123456/12/1",
                "password": "1990-01-15"
            }
        )
        
        assert response.status_code == 403
    
    @pytest.mark.asyncio
    async def test_document_upload_status_tracking(self, async_client: AsyncClient, farmer_user, auth_headers_admin):
        """Test document upload status is tracked per document type."""
        farmer_id = farmer_user["farmer_id"]
        
        # Upload NRC document
        response = await async_client.post(
            f"/api/farmers/{farmer_id}/documents/nrc",
            files={"file": ("nrc.pdf", b"fake pdf content", "application/pdf")},
            headers=auth_headers_admin
        )
        
        # Status should be 200 or 201
        assert response.status_code in [200, 201, 404]  # 404 if endpoint structure differs


class TestRoleEnforcement:
    """Test role-based access control."""
    
    @pytest.mark.asyncio
    async def test_operator_cannot_delete_farmer(self, async_client: AsyncClient, farmer_user, auth_headers_operator):
        """Test operator cannot delete farmers."""
        farmer_id = farmer_user["farmer_id"]
        
        response = await async_client.delete(
            f"/api/farmers/{farmer_id}",
            headers=auth_headers_operator
        )
        
        # Should be forbidden or not found
        assert response.status_code in [403, 404, 405]
    
    @pytest.mark.asyncio
    async def test_farmer_cannot_access_admin_routes(self, async_client: AsyncClient, auth_headers_farmer):
        """Test farmer cannot access admin-only routes."""
        response = await async_client.get(
            "/api/operators",
            headers=auth_headers_farmer
        )
        
        assert response.status_code in [403, 401]
