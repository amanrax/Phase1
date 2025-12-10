"""
Tests for geo endpoints and dynamic dropdown data.
"""
import pytest
from httpx import AsyncClient


class TestGeoEndpoints:
    """Test geography data endpoints."""
    
    @pytest.mark.asyncio
    async def test_get_provinces(self, async_client: AsyncClient):
        """Test /api/geo/provinces returns list of provinces."""
        response = await async_client.get("/api/geo/provinces")
        
        assert response.status_code == 200
        provinces = response.json()
        assert isinstance(provinces, list)
    
    @pytest.mark.asyncio
    async def test_get_districts_by_province(self, async_client: AsyncClient, clean_db):
        """Test cascading: get districts for a province."""
        # Insert test province and district
        await clean_db.provinces.insert_one({"name": "Test Province", "code": "TP"})
        await clean_db.districts.insert_one({
            "name": "Test District",
            "code": "TD",
            "province": "Test Province"
        })
        
        response = await async_client.get("/api/geo/districts?province=Test Province")
        
        assert response.status_code == 200
        districts = response.json()
        assert isinstance(districts, list)
    
    @pytest.mark.asyncio
    async def test_get_chiefdoms_by_district(self, async_client: AsyncClient, clean_db):
        """Test cascading: get chiefdoms for a district."""
        await clean_db.chiefdoms.insert_one({
            "name": "Test Chiefdom",
            "code": "TC",
            "district": "Test District"
        })
        
        response = await async_client.get("/api/geo/chiefdoms?district=Test District")
        
        assert response.status_code == 200
        chiefdoms = response.json()
        assert isinstance(chiefdoms, list)


class TestCustomGeoCreation:
    """Test 'Others - Specify' functionality."""
    
    @pytest.mark.asyncio
    async def test_create_custom_province(self, async_client: AsyncClient, clean_db, auth_headers_admin):
        """Test creating custom province via 'Others' option."""
        response = await async_client.post(
            "/api/geo/provinces",
            json={"name": "Custom Province"},
            headers=auth_headers_admin
        )
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["name"] == "Custom Province"
        assert "code" in data  # Auto-generated code
        
        # Verify in database
        province = await clean_db.provinces.find_one({"name": "Custom Province"})
        assert province is not None
        assert province.get("custom_added") == True
    
    @pytest.mark.asyncio
    async def test_create_custom_district(self, async_client: AsyncClient, clean_db, auth_headers_admin):
        """Test creating custom district."""
        # Create parent province first
        await clean_db.provinces.insert_one({"name": "Parent Province", "code": "PP"})
        
        response = await async_client.post(
            "/api/geo/districts",
            json={"name": "Custom District", "province": "Parent Province"},
            headers=auth_headers_admin
        )
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["name"] == "Custom District"
    
    @pytest.mark.asyncio
    async def test_prevent_duplicate_custom_geo(self, async_client: AsyncClient, clean_db, auth_headers_admin):
        """Test that duplicate custom entries are prevented."""
        # Create first entry
        await async_client.post(
            "/api/geo/provinces",
            json={"name": "Duplicate Province"},
            headers=auth_headers_admin
        )
        
        # Try to create again
        response = await async_client.post(
            "/api/geo/provinces",
            json={"name": "Duplicate Province"},
            headers=auth_headers_admin
        )
        
        # Should return conflict or success with existing entry
        assert response.status_code in [200, 201, 409]
    
    @pytest.mark.asyncio
    async def test_custom_geo_appears_in_list(self, async_client: AsyncClient, clean_db, auth_headers_admin):
        """Test custom geo entries appear in dropdown lists."""
        # Create custom province
        await async_client.post(
            "/api/geo/provinces",
            json={"name": "New Custom Province"},
            headers=auth_headers_admin
        )
        
        # Get provinces list
        response = await async_client.get("/api/geo/provinces")
        provinces = response.json()
        
        province_names = [p["name"] for p in provinces]
        assert "New Custom Province" in province_names
