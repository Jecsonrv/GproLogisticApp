#!/bin/bash
# ============================================
# GPRO Logistic - Production Deployment Script
# ============================================
# Uso: ./deploy.sh [backend|frontend|all]
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  GPRO Logistic - Deployment Script${NC}"
echo -e "${GREEN}============================================${NC}"

# Function to deploy backend
deploy_backend() {
    echo -e "\n${YELLOW}[Backend] Starting deployment...${NC}"
    cd backend

    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        echo -e "${YELLOW}Creating virtual environment...${NC}"
        python -m venv venv
    fi

    # Activate virtual environment
    source venv/bin/activate || source venv/Scripts/activate

    # Install dependencies
    echo -e "${YELLOW}Installing dependencies...${NC}"
    pip install -r requirements.txt --quiet

    # Run Django checks
    echo -e "${YELLOW}Running Django system checks...${NC}"
    python manage.py check --deploy

    # Collect static files
    echo -e "${YELLOW}Collecting static files...${NC}"
    python manage.py collectstatic --noinput --clear

    # Run migrations
    echo -e "${YELLOW}Running database migrations...${NC}"
    python manage.py migrate --noinput

    echo -e "${GREEN}[Backend] Deployment complete!${NC}"
    cd ..
}

# Function to deploy frontend
deploy_frontend() {
    echo -e "\n${YELLOW}[Frontend] Starting deployment...${NC}"
    cd frontend

    # Install dependencies
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm ci --silent

    # Build for production
    echo -e "${YELLOW}Building for production...${NC}"
    npm run build

    echo -e "${GREEN}[Frontend] Deployment complete!${NC}"
    echo -e "${YELLOW}Build output in: frontend/dist/${NC}"
    cd ..
}

# Main script
case "${1:-all}" in
    backend)
        deploy_backend
        ;;
    frontend)
        deploy_frontend
        ;;
    all)
        deploy_backend
        deploy_frontend
        ;;
    *)
        echo -e "${RED}Usage: $0 [backend|frontend|all]${NC}"
        exit 1
        ;;
esac

echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}  Deployment completed successfully!${NC}"
echo -e "${GREEN}============================================${NC}"
