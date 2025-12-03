#!/bin/bash
# Run backend tests with coverage

set -e

echo "🧪 Running Backend Tests..."
echo "================================"

# Install test dependencies
echo "📦 Installing test dependencies..."
cd backend
pip install -q -r requirements-test.txt

# Run pytest with coverage
echo ""
echo "🔬 Running tests..."
pytest tests/ \
  --verbose \
  --cov=app \
  --cov-report=term-missing \
  --cov-report=html:htmlcov \
  --asyncio-mode=auto \
  -x

echo ""
echo "✅ Tests completed!"
echo "📊 Coverage report saved to backend/htmlcov/index.html"
