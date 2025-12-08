# backend/app/database.py
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings
from typing import Optional
import logging


logger = logging.getLogger(__name__)


# Global MongoDB client instance
_client: Optional[AsyncIOMotorClient] = None
_database: Optional[AsyncIOMotorDatabase] = None


async def connect_to_database() -> None:
    """
    Initialize MongoDB connection on application startup.
    Should be called in FastAPI lifespan context.
    """
    global _client, _database
    
    try:
        logger.info(f"Connecting to MongoDB: {settings.MONGODB_DB_NAME}")
        
        # Create Motor client with connection pooling
        _client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            maxPoolSize=50,  # Maximum concurrent connections
            minPoolSize=10,  # Minimum idle connections
            maxIdleTimeMS=45000,  # Close idle connections after 45s
            serverSelectionTimeoutMS=5000,  # Timeout for server selection
            connectTimeoutMS=10000,  # Timeout for initial connection
            socketTimeoutMS=45000,  # Timeout for socket operations
        )
        
        # Get database handle
        _database = _client[settings.MONGODB_DB_NAME]
        
        # Verify connection by pinging the database
        await _database.command("ping")
        logger.info("✅ Successfully connected to MongoDB")
        
    except Exception as e:
        logger.error(f"❌ Failed to connect to MongoDB: {e}")
        raise


async def close_database_connection() -> None:
    """
    Close MongoDB connection on application shutdown.
    Should be called in FastAPI lifespan context.
    """
    global _client, _database
    
    if _client:
        try:
            logger.info("Closing MongoDB connection...")
            _client.close()
            _client = None
            _database = None
            logger.info("✅ MongoDB connection closed successfully")
        except Exception as e:
            logger.error(f"❌ Error closing MongoDB connection: {e}")


def get_database() -> AsyncIOMotorDatabase:
    """
    Get the MongoDB database instance.
    
    Returns:
        AsyncIOMotorDatabase: Active database connection
    
    Raises:
        RuntimeError: If database is not initialized
    """
    if _database is None:
        raise RuntimeError(
            "Database not initialized. Call connect_to_database() first."
        )
    return _database


# Collection getters for type safety and convenience
def get_collection(collection_name: str):
    """
    Get a MongoDB collection by name.
    
    Args:
        collection_name: Name of the collection
    
    Returns:
        AsyncIOMotorCollection: The requested collection
    """
    db = get_database()
    return db[collection_name]


# Predefined collection references aligned with your schema
def get_farmers_collection():
    """Get farmers collection"""
    return get_collection("farmers")


def get_users_collection():
    """Get users collection"""
    return get_collection("users")


def get_operators_collection():
    """Get operators collection"""
    return get_collection("operators")


def get_provinces_collection():
    """Get provinces collection"""
    return get_collection("provinces")


def get_districts_collection():
    """Get districts collection"""
    return get_collection("districts")


def get_chiefdoms_collection():
    """Get chiefdoms collection"""
    return get_collection("chiefdoms")


# Dependency for FastAPI routes
async def get_db() -> AsyncIOMotorDatabase:
    """
    FastAPI dependency for injecting database into route handlers.
    
    Usage:
        @router.get("/farmers")
        async def get_farmers(db: AsyncIOMotorDatabase = Depends(get_db)):
            farmers = await db.farmers.find().to_list(100)
            return farmers
    """
    return get_database()


# Alias for consistency with TypeScript naming conventions
get_db_motor = get_db


async def seed_initial_data() -> None:
    """
    Seed initial data into MongoDB collections.
    Called after database connection is established.
    """
    try:
        db = get_database()
        
        # Seed ethnic groups
        from app.services.ethnic_group_service import EthnicGroupService
        ethnic_group_service = EthnicGroupService(db)
        await ethnic_group_service.seed_default_ethnic_groups()
        
    except Exception as e:
        logger.error(f"❌ Error seeding initial data: {e}")
