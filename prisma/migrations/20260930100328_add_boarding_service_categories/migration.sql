-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ServiceCategory" ADD VALUE 'ASSIGN_ROOM';
ALTER TYPE "ServiceCategory" ADD VALUE 'FEEDING';
ALTER TYPE "ServiceCategory" ADD VALUE 'WATER';
ALTER TYPE "ServiceCategory" ADD VALUE 'WALKING';
ALTER TYPE "ServiceCategory" ADD VALUE 'MEDICATION';
ALTER TYPE "ServiceCategory" ADD VALUE 'CLEANING';
ALTER TYPE "ServiceCategory" ADD VALUE 'DAILY_HEALTH_CHECK';
