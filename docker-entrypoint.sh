#!/bin/sh
set -e

echo "=== [PetHub Backend Docker Entrypoint] ==="

# Chạy Prisma Migrate Deploy để đồng bộ database schema
echo "Running database migrations..."
npx prisma migrate deploy

# Chạy database seed (tạo tài khoản ADMIN mặc định nếu chưa có)
echo "Running database seed..."
npx prisma db seed || echo "Seed completed or skipped."

echo "Starting PetHub Backend Application..."
exec "$@"
