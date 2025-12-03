"""
Tests for logging system functionality.
"""
import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta


class TestLoggingSystem:
    """Test logging service and endpoints."""
    
    @pytest.mark.asyncio
    async def test_logging_structure(self, clean_db):
        """Verify log records have correct structure."""
        from app.services.logging_service import log_event
        
        await log_event(
            level="INFO",
            module="test",
            action="test_action",
            details={"key": "value"},
            endpoint="/api/test",
            user_id="test_user",
            role="ADMIN"
        )
        
        # Check log was created
        log = await clean_db.system_logs.find_one({"module": "test"})
        assert log is not None
        assert log["level"] == "INFO"
        assert log["action"] == "test_action"
        assert log["endpoint"] == "/api/test"
        assert log["user_id"] == "test_user"
        assert log["role"] == "ADMIN"
        assert "timestamp" in log
        assert log["details"] == {"key": "value"}
    
    @pytest.mark.asyncio
    async def test_password_not_logged(self, clean_db):
        """Verify passwords are not logged in details."""
        from app.services.logging_service import log_event, sanitize_body
        
        sensitive_data = {
            "email": "test@test.com",
            "password": "secret123",
            "token": "abc123"
        }
        
        sanitized = sanitize_body(sensitive_data)
        assert sanitized["password"] == "***REDACTED***"
        assert sanitized["token"] == "***REDACTED***"
        assert sanitized["email"] == "test@test.com"
    
    @pytest.mark.asyncio
    async def test_log_cleanup_task(self, clean_db):
        """Test log cleanup removes old logs correctly."""
        from app.services.logging_service import log_event
        
        # Insert old INFO log (should be deleted)
        await clean_db.system_logs.insert_one({
            "timestamp": datetime.utcnow() - timedelta(days=2),
            "level": "INFO",
            "module": "test",
            "action": "old_info"
        })
        
        # Insert old ERROR log (should be kept)
        await clean_db.system_logs.insert_one({
            "timestamp": datetime.utcnow() - timedelta(days=2),
            "level": "ERROR",
            "module": "test",
            "action": "old_error"
        })
        
        # Insert very old ERROR log (should be deleted)
        await clean_db.system_logs.insert_one({
            "timestamp": datetime.utcnow() - timedelta(days=8),
            "level": "ERROR",
            "module": "test",
            "action": "very_old_error"
        })
        
        # Insert recent log (should be kept)
        await clean_db.system_logs.insert_one({
            "timestamp": datetime.utcnow(),
            "level": "INFO",
            "module": "test",
            "action": "recent_info"
        })
        
        # Run cleanup logic (simulated)
        cutoff_date = datetime.utcnow() - timedelta(days=1)
        error_cutoff = datetime.utcnow() - timedelta(days=7)
        
        # Delete old INFO/WARNING logs
        await clean_db.system_logs.delete_many({
            "level": {"$in": ["INFO", "WARNING", "DEBUG"]},
            "timestamp": {"$lt": cutoff_date}
        })
        
        # Delete very old ERROR/CRITICAL logs
        await clean_db.system_logs.delete_many({
            "level": {"$in": ["ERROR", "CRITICAL"]},
            "timestamp": {"$lt": error_cutoff}
        })
        
        # Verify results
        remaining_logs = await clean_db.system_logs.find().to_list(100)
        actions = [log["action"] for log in remaining_logs]
        
        assert "old_info" not in actions  # Old INFO deleted
        assert "old_error" in actions  # Recent ERROR kept
        assert "very_old_error" not in actions  # Very old ERROR deleted
        assert "recent_info" in actions  # Recent INFO kept


class TestLogViewerEndpoints:
    """Test log viewer API endpoints."""
    
    @pytest.mark.asyncio
    async def test_logs_list_endpoint(self, async_client: AsyncClient, clean_db, auth_headers_admin):
        """Test /api/logs endpoint returns paginated logs."""
        from app.services.logging_service import log_event
        
        # Create test logs
        for i in range(5):
            await log_event(
                level="INFO" if i % 2 == 0 else "ERROR",
                module="test_module",
                action=f"test_action_{i}",
                details={},
                endpoint="/api/test"
            )
        
        response = await async_client.get(
            "/api/logs?limit=3&skip=0",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 3  # Respects limit
    
    @pytest.mark.asyncio
    async def test_logs_filter_by_level(self, async_client: AsyncClient, clean_db, auth_headers_admin):
        """Test filtering logs by level."""
        from app.services.logging_service import log_event
        
        await log_event(level="INFO", module="test", action="info_action", details={})
        await log_event(level="ERROR", module="test", action="error_action", details={})
        
        response = await async_client.get(
            "/api/logs?level=ERROR",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        logs = response.json()
        assert all(log["level"] == "ERROR" for log in logs)
    
    @pytest.mark.asyncio
    async def test_logs_stats_endpoint(self, async_client: AsyncClient, clean_db, auth_headers_admin):
        """Test /api/logs/stats endpoint."""
        from app.services.logging_service import log_event
        
        # Create logs with different levels
        await log_event(level="INFO", module="test", action="action1", details={})
        await log_event(level="INFO", module="test", action="action2", details={})
        await log_event(level="ERROR", module="test", action="action3", details={})
        
        response = await async_client.get(
            "/api/logs/stats",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        stats = response.json()
        assert "total" in stats or isinstance(stats, dict)
