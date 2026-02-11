#!/bin/bash
set -e

echo "=== Resetting Database ==="
echo ""
echo "WARNING: This will delete all data and recreate the database."
read -p "Are you sure? (y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo "1. Resetting database..."
npx prisma migrate reset --force

echo ""
echo "2. Seeding database..."
npm run db:seed

echo ""
echo "=== Database Reset Complete! ==="
