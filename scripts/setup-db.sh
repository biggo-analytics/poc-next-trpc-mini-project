#!/bin/bash
set -e

echo "=== POC Next.js + tRPC + Prisma: Database Setup ==="
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
  echo "Error: Docker is not installed. Please install Docker first."
  exit 1
fi

# Start PostgreSQL
echo "1. Starting PostgreSQL with Docker Compose..."
docker compose up -d postgres
echo "   Waiting for PostgreSQL to be ready..."
sleep 3

# Check connection
until docker compose exec postgres pg_isready -U postgres > /dev/null 2>&1; do
  echo "   Waiting for PostgreSQL..."
  sleep 1
done
echo "   PostgreSQL is ready!"

# Create .env if not exists
if [ ! -f .env ]; then
  echo ""
  echo "2. Creating .env file from .env.example..."
  cp .env.example .env
  echo "   .env file created!"
else
  echo ""
  echo "2. .env file already exists, skipping..."
fi

# Generate Prisma Client
echo ""
echo "3. Generating Prisma Client..."
npx prisma generate

# Run migrations
echo ""
echo "4. Running database migrations..."
npx prisma migrate dev --name init

# Seed database
echo ""
echo "5. Seeding database..."
npm run db:seed

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "You can now run:"
echo "  npm run dev        - Start development server"
echo "  npm run db:studio  - Open Prisma Studio"
echo ""
