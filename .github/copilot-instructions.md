# CEM (Chiefdom Empowerment Model) – AI Agent Instructions
**For Copilot, Gemini, Perplexity – EC2 Backend + Mobile APK Architecture**

Last Updated: Jan 3, 2026 | Status: Production Ready

---

## 🎯 YOUR ACTUAL DEPLOYMENT ARCHITECTURE

```
┌─────────────────────────────────────────────────────────┐
│                    GITHUB CODESPACES                    │
│                                                         │
│  Frontend (React + Vite)  ← Build APK + Development   │
│  - npm run build:mobile → Android APK                 │
│  - GitHub Actions CI/CD                               │
└─────────────────────────────────────────────────────────┘
                           ↓ (HTTPS API calls)
┌─────────────────────────────────────────────────────────┐
│                  AWS EC2 (t3.micro)                     │
│                   Single Instance                       │
│                                                         │
│  ┌─── Docker Container 1: FastAPI (port 8000) ───┐    │
│  │  - All routes (auth, farmers, reports, etc.)   │    │
│  │  - Motor (async) → MongoDB Atlas              │    │
│  │  - CORS enabled for mobile + APK              │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─── Docker Container 2: Celery Worker ─────────┐    │
│  │  - ID card generation (async tasks)           │    │
│  │  - PyMongo (sync) → MongoDB Atlas             │    │
│  │  - Log cleanup tasks (daily)                  │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─── Docker Container 3: Redis (port 6379) ────┐    │
│  │  - Celery broker (task queue)                 │    │
│  │  - Cache layer (if needed)                    │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─── NGINX Reverse Proxy (port 80/443) ────────┐    │
│  │  - Routes traffic to FastAPI:8000            │    │
│  │  - SSL/TLS (Let's Encrypt)                   │    │
│  │  - CORS headers for APK                      │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                           ↓ (TCP connection)
┌─────────────────────────────────────────────────────────┐
│            MongoDB Atlas (Cloud Database)               │
│                                                         │
│  - Farmers collection                                  │
│  - Users collection                                    │
│  - ID cards collection                                 │
│  - GridFS (file storage: photos, PDFs)                 │
│  - system_logs collection                              │
│  - All backup & replication handled by Atlas           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│            Mobile APK (Android Device)                  │
│                                                         │
│  - Built via: frontend/build-mobile.sh                 │
│  - Uses Capacitor + Gradle                             │
│  - Connects to EC2 backend via HTTPS                   │
│  - API_BASE_URL = https://your-ec2-ip.com             │
│  - Stores JWT tokens in localStorage                   │
└─────────────────────────────────────────────────────────┘
```

---

## 1. PROJECT STRUCTURE (From Your Files)

### Backend (EC2-Ready Docker)
```
backend/
├── app/
│   ├── main.py                    # FastAPI (includes CORS for mobile APK)
│   ├── config.py                  # Pydantic config (MONGO_URI, REDIS_URL required)
│   ├── database.py                # Motor async client
│   ├── routes/                    # All REST endpoints
│   │   ├── auth.py               # Login, refresh, logout
│   │   ├── farmers.py            # CRUD, status
│   │   ├── farmer_idcards.py     # Generate, download ID cards
│   │   ├── farmer_photos.py      # Photo uploads
│   │   ├── farmers_qr.py         # QR codes
│   │   ├── dashboard.py          # Metrics
│   │   ├── operators.py          # Operator management
│   │   ├── reports.py            # System reports
│   │   ├── supplies.py           # Supply requests
│   │   ├── geo.py                # Location data
│   │   ├── logs.py               # Log retrieval
│   │   ├── health.py             # Health check endpoint
│   │   └── ... (more routes)
│   ├── services/                  # Business logic
│   │   ├── farmer_service.py     # Farmer operations
│   │   ├── idcard_service.py     # ID card logic
│   │   ├── photo_service.py      # Photo handling
│   │   ├── gridfs_service.py     # GridFS file storage
│   │   ├── logging_service.py    # Async logging
│   │   └── ... (more services)
│   ├── tasks/                     # Celery background jobs
│   │   ├── celery_app.py         # Celery + Redis config
│   │   ├── id_card_task.py       # Async ID card generation
│   │   ├── log_cleanup_task.py   # Daily log cleanup
│   │   └── sync_tasks.py         # Data sync tasks
│   └── ... (middleware, models, utils)
├── Dockerfile                     # Multi-stage production image
├── requirements.txt               # FastAPI, motor, pymongo, celery, redis-py
└── docker-compose.yml             # Local dev only (NOT for EC2)
```

### Frontend (Mobile APK Build)
```
frontend/
├── src/
│   ├── pages/                     # All full pages
│   │   ├── Login.tsx
│   │   ├── FarmerDashboard.tsx
│   │   ├── FarmerIDCard.tsx       # ← Uses blob + auth headers
│   │   ├── FarmerRegistration/    # Multi-step form
│   │   └── ... (more pages)
│   ├── services/                  # API layer (service layer only)
│   │   ├── auth.service.ts       # POST /auth/login, /auth/refresh
│   │   ├── farmer.service.ts     # Farmer CRUD, ID card ops
│   │   ├── geo.service.ts        # Location data
│   │   └── ... (more services)
│   ├── utils/
│   │   └── axios.ts              # Pre-configured with auth interceptor
│   ├── store/
│   │   └── authStore.ts          # Zustand: tokens + user
│   └── ... (components, types, config)
├── android/                       # Gradle + Capacitor
│   ├── build.gradle
│   ├── app/build.gradle
│   └── ... (Android project)
├── capacitor.config.ts            # Mobile config
├── build-mobile.sh                # Script to build APK
├── vite.config.ts                 # Bundler config
└── package.json                   # Dependencies
```

### AWS Deployment (EC2)
```
aws-deployment/
├── 00-preflight-check.sh         # Validate AWS setup
├── 01-cleanup-aws.sh             # Remove old resources
├── 02-setup-aws-infrastructure.sh # Create VPC, Security Groups, etc.
├── 03-create-secrets.sh          # Store secrets in AWS Secrets Manager
├── 04-create-iam-roles.sh        # IAM roles for EC2
├── 05-build-and-push.sh          # Build Docker, push to ECR (optional)
├── 06-deploy-ecs-service.sh      # Deploy to ECS (alternative)
├── deploy-all.sh                 # Run all scripts
├── Dockerfile                    # Backend Docker image
├── docker-compose.yml            # Production stack on EC2
└── README.md                      # Deployment guide
```

---

## 2. ENVIRONMENT CONFIGURATION

### Backend .env (On EC2)
```ini
# MongoDB Atlas (required)
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/cem_db?retryWrites=true&w=majority

# Redis (on EC2, internal Docker)
REDIS_URL=redis://localhost:6379/0

# JWT (required, random 32+ chars)
JWT_SECRET=your-super-secret-key-min-32-chars-long
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Environment
ENVIRONMENT=production
LOG_LEVEL=info

# CORS (for mobile APK + web)
ALLOW_ORIGINS=http://localhost:5173,https://your-ec2-ip.com,http://your-ec2-ip.com

# Upload paths (EC2 local storage)
UPLOAD_DIR=/home/ec2-user/uploads
MAX_UPLOAD_SIZE_MB=10

# Optional: Email notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

### Frontend .env (For APK Build)
```ini
# Development (local testing)
VITE_API_BASE_URL=http://localhost:8000
VITE_LOG_LEVEL=debug

# OR Production (for APK)
VITE_API_BASE_URL=https://your-ec2-ip.com   # Your EC2 public IP or domain
VITE_LOG_LEVEL=info
```

**To generate APK with production backend:**
```bash
cd frontend

# Update .env.production
echo 'VITE_API_BASE_URL=https://your-ec2-ip.com' > .env.production

# Build APK
npm run build:mobile
# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 3. EC2 DEPLOYMENT STEPS

### Prerequisites
- ✅ AWS account with free tier EC2 (t3.micro)
- ✅ MongoDB Atlas cluster (free tier)
- ✅ GitHub repository with code

### Step 1: Launch EC2 Instance
```bash
# From aws-deployment/
./00-preflight-check.sh          # Validate AWS setup
./01-cleanup-aws.sh              # Optional: remove old resources
./02-setup-aws-infrastructure.sh # Create VPC, security groups
```

Or manually:
```bash
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.micro \
  --key-name your-key-pair \
  --security-groups cem-backend \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=cem-backend}]'
```

### Step 2: Connect & Install Docker
```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@your-ec2-ip

# Install Docker + Docker Compose
curl get.docker.com | bash
sudo usermod -aG docker ec2-user
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Step 3: Clone Repo & Set Secrets
```bash
# Clone your repo
git clone https://github.com/yourusername/cem.git
cd cem

# Create .env.production with MongoDB Atlas URI + JWT secret
cat > .env.production << EOF
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/cem_db
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=your-super-secret-key
ENVIRONMENT=production
ALLOW_ORIGINS=https://your-ec2-ip.com,http://your-ec2-ip.com
EOF

# ⚠️ DO NOT COMMIT .env.production to Git
echo ".env.production" >> .gitignore
```

### Step 4: Deploy with Docker
```bash
# Build and start all services
cd backend
docker build -t cem-backend:latest .
cd ..

# Use docker-compose.yml to run backend + celery + redis
docker-compose up -d

# Verify services are running
docker ps
docker-compose logs -f backend

# Test health check
curl http://localhost:8000/health
```

### docker-compose.yml (For EC2)
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    container_name: cem-backend
    ports:
      - "8000:8000"
    environment:
      - MONGO_URI=${MONGO_URI}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
      - ENVIRONMENT=production
      - ALLOW_ORIGINS=${ALLOW_ORIGINS}
    depends_on:
      - redis
    volumes:
      - ./uploads:/app/uploads
    restart: always

  redis:
    image: redis:7-alpine
    container_name: cem-redis
    ports:
      - "6379:6379"
    restart: always

  celery-worker:
    build: ./backend
    container_name: cem-celery
    command: celery -A app.tasks.celery_app worker --loglevel=info
    environment:
      - MONGO_URI=${MONGO_URI}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - redis
    restart: always

  # Optional: Celery Beat (for scheduled tasks)
  celery-beat:
    build: ./backend
    container_name: cem-celery-beat
    command: celery -A app.tasks.celery_app beat --loglevel=info
    environment:
      - MONGO_URI=${MONGO_URI}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - redis
    restart: always
```

### Step 5: Set Up NGINX (Optional but Recommended)
```bash
# Install NGINX
sudo yum install nginx -y

# Create config (reverse proxy to FastAPI)
sudo tee /etc/nginx/conf.d/cem-backend.conf > /dev/null << EOF
upstream fastapi {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name _;

    client_max_body_size 10M;

    location / {
        proxy_pass http://fastapi;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # CORS headers (important for mobile APK)
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET,POST,PUT,DELETE,OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization' always;
    }
}
EOF

# Start NGINX
sudo systemctl start nginx
sudo systemctl enable nginx

# Test
curl http://your-ec2-ip/health
```

### Step 6: Enable SSL (Let's Encrypt)
```bash
# Install Certbot
sudo yum install certbot python3-certbot-nginx -y

# Get certificate (replace with your domain or use IP)
sudo certbot certonly --standalone -d your-domain.com

# Update NGINX to use SSL
sudo certbot --nginx -d your-domain.com

# Auto-renew
sudo systemctl enable certbot-renew.timer
```

---

## 4. MOBILE APK BUILD & DEPLOYMENT

### Build APK Locally (In GitHub Codespaces)
```bash
cd frontend

# Update API endpoint for production
echo 'VITE_API_BASE_URL=https://your-ec2-ip.com' > .env.production

# Build APK
npm run build:mobile

# Output location
ls android/app/build/outputs/apk/debug/app-debug.apk

# Copy to artifacts folder for easy download
cp android/app/build/outputs/apk/debug/app-debug.apk ../artifacts/app-production.apk
```

### Deploy APK to Device
```bash
# Option 1: Via USB (if adb installed)
adb install artifacts/app-production.apk

# Option 2: Upload to cloud storage and share link
# Option 3: Use GitHub Actions to auto-build on push
```

### GitHub Actions CI/CD for APK
```yaml
# .github/workflows/build-android.yml
name: Build Android APK

on:
  push:
    branches: [main, master]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd frontend && npm install
      
      - name: Build APK
        run: cd frontend && npm run build:mobile
      
      - name: Upload APK to artifacts
        uses: actions/upload-artifact@v3
        with:
          name: app-debug.apk
          path: frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 5. CRITICAL PATTERNS IN YOUR PROJECT

### Pattern 1: Motor vs PyMongo (CRITICAL)

**Routes (EC2 FastAPI)** → Motor (async)
```python
# backend/app/routes/farmers.py
from app.database import get_db

@router.get("/api/farmers/{farmer_id}")
async def get_farmer(farmer_id: str, db = Depends(get_db)):
    # db is Motor client (async)
    farmer = await db.farmers.find_one({"farmer_id": farmer_id})
    return farmer
```

**Celery Tasks (EC2 Worker)** → PyMongo (sync)
```python
# backend/app/tasks/id_card_task.py
from pymongo import MongoClient

# Create sync client (NOT Motor!)
MONGO_CLIENT = MongoClient(MONGO_URI)
db = MONGO_CLIENT["cem_db"]

@celery_app.task
def generate_id_card(farmer_id: str):
    # Uses sync pymongo
    farmer = db.farmers.find_one({"farmer_id": farmer_id})
    # ... generate PDF ...
    db.farmers.update_one(
        {"farmer_id": farmer_id},
        {"$set": {"id_card_file_id": file_id}}
    )
```

### Pattern 2: Mobile APK Authentication

**Frontend** (React + Capacitor)
```typescript
// frontend/src/utils/axios.ts
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000
});

// Request interceptor: attach JWT token
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: refresh on 401
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Attempt one refresh
      try {
        const { data } = await axiosInstance.post('/auth/refresh', {});
        localStorage.setItem('access_token', data.access_token);
        error.config.headers.Authorization = `Bearer ${data.access_token}`;
        return axiosInstance(error.config);
      } catch {
        // Logout on failed refresh
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

**Backend** (FastAPI)
```python
# backend/app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://your-ec2-ip.com",
        "http://your-ec2-ip.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Pattern 3: Service Layer (NO Direct Axios)

**Frontend Component** (Mobile APK)
```typescript
// frontend/src/pages/FarmerIDCard.tsx
import { farmerService } from '@/services/farmer.service';

const FarmerIDCard = () => {
  const [farmer, setFarmer] = useState(null);

  useEffect(() => {
    const load = async () => {
      const data = await farmerService.getFarmer(farmerId);
      setFarmer(data);
    };
    load();
  }, []);

  const handleGenerateIDCard = async () => {
    await farmerService.generateIDCard(farmer.farmer_id);
  };
};
```

**Service Layer**
```typescript
// frontend/src/services/farmer.service.ts
import axios from '@/utils/axios'; // Pre-configured with auth

export const farmerService = {
  getFarmer: async (farmerId: string) => {
    const { data } = await axios.get(`/api/farmers/${farmerId}`);
    return data;
  },

  generateIDCard: async (farmerId: string) => {
    const { data } = await axios.post(
      `/api/farmers/${farmerId}/idcards/generate`
    );
    return data;
  },

  downloadIDCard: async (farmerId: string) => {
    const response = await axios.get(
      `/api/farmers/${farmerId}/idcards/download`,
      { responseType: 'blob' }
    );
    // Download file...
    return true;
  }
};
```

---

## 6. INSTRUCTION TEMPLATES FOR AI AGENTS

### Template A: Add Backend Endpoint (EC2)
```
CONTEXT:
Need to add endpoint to approve farmers in bulk

LOCATION:
backend/app/routes/farmers.py (add new route)

REQUIREMENTS:
- POST /api/farmers/bulk-approve
- Accept list of farmer_ids
- Update status to "verified"
- Log via logging_service.py
- Only admin role allowed
- Return success count

IMPLEMENTATION:
1. Add route handler (use Motor async)
2. Add service method in farmer_service.py
3. Call logging_service.log() for each update
4. Validate admin role with @require_role("admin")

DO NOT:
- Use PyMongo (use Motor for routes)
- Hardcode admin check (use decorator)
- Skip logging
```

### Template B: Fix Mobile APK Connection
```
CONTEXT:
Mobile APK cannot connect to EC2 backend

LOCATION:
frontend/.env.production

DIAGNOSIS:
1. Check VITE_API_BASE_URL is correct (your EC2 public IP)
2. Verify EC2 security group allows port 80/443
3. Check CORS headers in backend/app/main.py
4. Verify backend is running: docker ps

SOLUTION:
# Get EC2 public IP
aws ec2 describe-instances --filters "Name=tag:Name,Values=cem-backend" \
  --query 'Reservations[].Instances[].PublicIpAddress'

# Update frontend
echo "VITE_API_BASE_URL=https://YOUR_EC2_IP" > frontend/.env.production

# Rebuild APK
cd frontend && npm run build:mobile

# Check backend CORS
curl -H "Origin: http://your-ec2-ip" \
  http://your-ec2-ip/health
```

### Template C: Deploy New Version to EC2
```
CONTEXT:
Updated backend code, need to deploy to EC2

LOCATION:
aws-deployment/ or manual docker-compose

STEPS:
1. Git push changes to main branch
2. SSH into EC2
3. Pull latest code: git pull origin main
4. Rebuild Docker: docker-compose up -d --build
5. Verify health: curl http://localhost:8000/health
6. Check logs: docker-compose logs -f backend

TROUBLESHOOT:
# View all containers
docker ps -a

# See logs
docker-compose logs backend

# Restart service
docker-compose restart backend

# Full reset (if needed)
docker-compose down
docker-compose up -d
```

### Template D: Build & Deploy APK
```
CONTEXT:
Need to build APK with production backend endpoint

LOCATION:
frontend/build-mobile.sh or npm commands

STEPS:
1. In Codespaces, update .env.production:
   VITE_API_BASE_URL=https://your-ec2-ip.com

2. Build APK:
   cd frontend
   npm run build:mobile

3. APK location:
   android/app/build/outputs/apk/debug/app-debug.apk

4. Download & install on device:
   adb install android/app/build/outputs/apk/debug/app-debug.apk

5. Or share via GitHub Artifacts:
   - Upload to artifacts/ folder
   - Commit to repo
   - Download from GitHub
```

---

## 7. DEBUGGING CHECKLIST

### Mobile APK Cannot Connect to Backend
```bash
# 1. Check backend is running on EC2
docker ps | grep cem-backend

# 2. Check logs
docker-compose logs backend | tail -50

# 3. Test health endpoint
curl https://your-ec2-ip/health

# 4. Check CORS
curl -H "Origin: http://your-ec2-ip" https://your-ec2-ip/health

# 5. Verify .env.production in frontend
cat frontend/.env.production

# 6. Rebuild APK with correct URL
cd frontend && npm run build:mobile
```

### Celery Task Not Running
```bash
# 1. Check celery-worker container
docker logs cem-celery

# 2. Check Redis connection
docker exec cem-redis redis-cli ping

# 3. Check task in MongoDB
mongosh "mongodb+srv://..." --eval "db.system_logs.find({level: 'error'})"

# 4. Restart worker
docker-compose restart celery-worker
```

### Backend API Returning 500
```bash
# 1. Check logs
docker-compose logs backend | grep -i error

# 2. Check MongoDB connection
# In backend container:
docker exec cem-backend python -c "from app.database import get_db; print('DB OK')"

# 3. Test endpoint manually
curl -X GET http://localhost:8000/api/farmers/ZM12345

# 4. Check .env.production
docker exec cem-backend env | grep MONGO
```

---

## 8. FILE LOCATIONS QUICK REFERENCE

| Task | File |
|------|------|
| Add backend endpoint | `backend/app/routes/{domain}.py` |
| Add backend service | `backend/app/services/{domain}_service.py` |
| Add Celery task | `backend/app/tasks/{job}_task.py` |
| Add mobile page | `frontend/src/pages/{Feature}.tsx` |
| Add API service | `frontend/src/services/{domain}.service.ts` |
| Configure mobile URL | `frontend/.env.production` |
| EC2 config | `.env.production` (root) |
| Deploy to EC2 | `aws-deployment/deploy-all.sh` |
| View EC2 logs | `docker-compose logs -f backend` |
| Build APK | `cd frontend && npm run build:mobile` |

---

## 9. CRITICAL DO NOTs (EC2 + Mobile)

| ❌ DO NOT | ✓ DO THIS |
|-----------|----------|
| Use Motor in Celery tasks | Use PyMongo directly in tasks/ |
| Hardcode API URL in components | Use .env.production + VITE_API_BASE_URL |
| Call axios directly in components | Use service layer from frontend/src/services/ |
| Commit .env.production to Git | Store in EC2 only, never in repo |
| Use localStorage for sensitive data | OK for tokens (with refresh mechanism) |
| Disable CORS on EC2 | Keep CORS enabled for mobile APK + web |
| Run docker without -d flag | Use docker-compose up -d (background) |
| Trust self-signed certs on mobile | Use proper SSL (Let's Encrypt via NGINX) |
| Use PyMongo in FastAPI routes | Use Motor (async) for request handlers |
| Forget to set ALLOW_ORIGINS | Include EC2 IP in CORS whitelist |

---

## 10. QUICK DEPLOYMENT REFERENCE

### First-Time EC2 Deployment
```bash
# From local machine
ssh -i your-key.pem ec2-user@your-ec2-ip

# On EC2
git clone https://github.com/yourusername/cem.git
cd cem

# Create .env.production with secrets
nano .env.production

# Start services
docker-compose up -d
docker-compose logs -f

# Test
curl http://localhost:8000/health
```

### Update Backend Code (Subsequent Deploys)
```bash
# On EC2
cd cem
git pull origin main
docker-compose up -d --build
docker-compose logs -f backend
```

### Build APK for Production
```bash
# In Codespaces
cd frontend
echo "VITE_API_BASE_URL=https://your-ec2-ip.com" > .env.production
npm run build:mobile
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

### Monitor EC2 Services
```bash
# SSH to EC2
docker ps                          # List all containers
docker-compose logs -f             # Stream all logs
docker stats                       # Monitor resources
curl http://localhost:8000/health # Health check
```

---

## 11. ARCHITECTURE SUMMARY

**Your deployment is:**
- ✅ Single EC2 instance (cost-effective)
- ✅ Backend + Celery + Redis all on EC2
- ✅ MongoDB Atlas (managed cloud database)
- ✅ Mobile APK connects via HTTPS to EC2
- ✅ NGINX reverse proxy (optional but recommended)
- ✅ GitHub Codespaces for development

**Key differences from generic guides:**
- NOT using ECS/Fargate (too expensive for free tier)
- NOT using multiple databases (only MongoDB Atlas)
- NOT using separate Redis service (Redis on EC2)
- Mobile APK is PRIMARY (web is secondary)
- EC2 runs ALL backend services in Docker

---

## 12. SUCCESS CHECKLIST

- [ ] EC2 instance running (t3.micro)
- [ ] Docker + Docker Compose installed
- [ ] MongoDB Atlas cluster connected
- [ ] Backend running in Docker (port 8000)
- [ ] Celery worker processing tasks
- [ ] Redis broker active
- [ ] CORS headers configured for mobile
- [ ] NGINX reverse proxy working (optional)
- [ ] SSL certificate installed (Let's Encrypt)
- [ ] Mobile APK connects to EC2 backend
- [ ] Login works on APK
- [ ] Can generate ID cards
- [ ] Logs appear in MongoDB
- [ ] Health check: `curl https://your-ec2-ip/health` returns 200

---

**Last Updated:** Jan 3, 2026 | Architecture: Single EC2 Instance
**Next Steps:** Testing and modifications and enhacements and bug fixings.

