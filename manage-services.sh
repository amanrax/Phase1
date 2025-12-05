#!/bin/bash
# Helper script to manage the application when Docker CLI is not available
# This uses HTTP requests to interact with services

set -e

BACKEND_URL="http://localhost:8000"
FRONTEND_URL="http://localhost:5173"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

check_service() {
    local name=$1
    local url=$2
    
    if curl -s --max-time 2 "$url" > /dev/null 2>&1; then
        print_success "$name is running at $url"
        return 0
    else
        print_error "$name is not responding at $url"
        return 1
    fi
}

# Commands
case "${1:-status}" in
    status)
        print_header "Service Status Check"
        echo ""
        
        check_service "Backend API" "$BACKEND_URL"
        check_service "Frontend" "$FRONTEND_URL"
        
        echo ""
        print_header "MongoDB & Redis Status"
        if nc -z localhost 27017 2>/dev/null; then
            print_success "MongoDB is accessible on port 27017"
        else
            print_error "MongoDB is not accessible on port 27017"
        fi
        
        if nc -z localhost 6379 2>/dev/null; then
            print_success "Redis is accessible on port 6379"
        else
            print_error "Redis is not accessible on port 6379"
        fi
        ;;
        
    restart-backend)
        print_header "Restarting Backend"
        print_info "Triggering backend reload by touching main.py..."
        touch /workspaces/Phase1/backend/app/main.py
        sleep 2
        
        if check_service "Backend API" "$BACKEND_URL"; then
            print_success "Backend restarted successfully"
        else
            print_error "Backend failed to restart"
        fi
        ;;
        
    logs-backend)
        print_header "Backend Logs"
        print_info "Checking uvicorn process..."
        for pid in /proc/[0-9]*/cmdline; do 
            if [ -r "$pid" ] && tr '\0' ' ' < "$pid" 2>/dev/null | grep -q "uvicorn"; then
                echo "Found uvicorn process: $(basename $(dirname $pid))"
            fi
        done
        ;;
        
    health)
        print_header "Health Check"
        echo ""
        
        print_info "Backend Root:"
        curl -s "$BACKEND_URL/" | jq . 2>/dev/null || curl -s "$BACKEND_URL/"
        
        echo ""
        print_info "Backend Health:"
        curl -s "$BACKEND_URL/api/health/full" | jq . 2>/dev/null || curl -s "$BACKEND_URL/api/health/full"
        ;;
        
    cors-test)
        print_header "CORS Configuration Test"
        local origin="${2:-https://example-5173.app.github.dev}"
        
        print_info "Testing CORS for origin: $origin"
        echo ""
        
        print_info "Sending OPTIONS request..."
        curl -X OPTIONS "$BACKEND_URL/api/auth/login" \
            -H "Origin: $origin" \
            -H "Access-Control-Request-Method: POST" \
            -H "Access-Control-Request-Headers: Content-Type" \
            -I 2>&1 | grep -iE "HTTP|access-control"
        ;;
        
    help|*)
        print_header "Available Commands"
        echo ""
        echo -e "${GREEN}status${NC}            - Check status of all services"
        echo -e "${GREEN}restart-backend${NC}   - Restart the backend by triggering reload"
        echo -e "${GREEN}logs-backend${NC}      - Show backend process information"
        echo -e "${GREEN}health${NC}            - Check backend health endpoints"
        echo -e "${GREEN}cors-test [origin]${NC} - Test CORS configuration"
        echo -e "${GREEN}help${NC}              - Show this help message"
        echo ""
        ;;
esac
