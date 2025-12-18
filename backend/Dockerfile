# CEM Backend Dockerfile - AWS Production Ready
# Optimized for ECS Fargate with GridFS file storage

FROM python:3.11-slim

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    netcat-openbsd \
    libjpeg-dev \
    zlib1g-dev \
    libpng-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt /app/
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy application code
COPY app ./app
COPY scripts ./scripts

# Expose port
EXPOSE 8000

# Health check (for ECS)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl --fail http://localhost:8000/api/health || exit 1

# Default command (can be overridden for Celery worker)
CMD ["sh", "-c", "\
echo '🚀 Starting CEM Backend...' && \
python scripts/seed_admin.py || true && \
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2"]
