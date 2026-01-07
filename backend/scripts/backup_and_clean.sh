#!/bin/bash
# Backup and Clean Database Script
# Run this on your EC2 instance where docker-compose is running

set -e

echo "🔄 CEM Database Backup & Cleanup"
echo "================================"
echo ""

# Check if containers are running
if ! docker-compose ps | grep -q "farmer-backend.*Up"; then
    echo "❌ Error: farmer-backend container is not running"
    echo "Please start the containers first: docker-compose up -d"
    exit 1
fi

echo "✅ Backend container is running"
echo ""

# Step 1: Create backup
echo "📦 Step 1: Creating backup..."
docker-compose exec -T farmer-backend python scripts/backup_database.py
echo ""

# Step 2: Run cleanup
echo "🧹 Step 2: Running database cleanup..."
docker-compose exec -T farmer-backend python scripts/clean_database.py
echo ""

echo "✅ All done!"
echo ""
echo "📁 Backup files are stored in: backend/backups/"
echo "💡 To restore a backup, use: docker-compose exec farmer-backend python scripts/restore_database.py <backup_file>"
