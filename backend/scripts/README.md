# Database Backup & Cleanup Scripts

Standalone Python scripts to backup and clean MongoDB Atlas database.

## Requirements

```bash
pip install pymongo passlib bcrypt
```

## Usage

### 1. Set Environment Variables

```bash
export MONGODB_URL="mongodb+srv://username:password@cluster.mongodb.net/"
export MONGODB_DB_NAME="zambian_farmer_db"
```

### 2. Run Backup (Always do this first!)

```bash
python backup_database.py
```

This creates a backup file in `backend/backups/backup_TIMESTAMP.json`

### 3. Run Cleanup

```bash
python clean_database.py
```

This will:
- ✅ Delete test provinces ("test province", "test custom province")
- ✅ Delete ALL farmers and their photos
- ✅ Delete ALL supply requests
- ✅ Delete ALL operators
- ✅ Keep only 1 admin user
- ✅ Clean up old logs (>30 days)

### 4. Check Admin Credentials

After cleanup, the script will display:

```
🔑 Admin Login Credentials:
============================================================
  Email:    admin@agrimanage.com
  Password: admin1234
  Name:     System Administrator
============================================================
```

## One-Liner (Backup + Clean)

```bash
python backup_database.py && python clean_database.py
```

## Restore from Backup

(Restoration script coming soon)

## Safety Notes

- ⚠️ **ALWAYS** run backup first
- ⚠️ Cleanup is **IRREVERSIBLE** without backup
- ⚠️ Test on staging environment first if available
- ✅ Backups are stored in `backend/backups/` directory
