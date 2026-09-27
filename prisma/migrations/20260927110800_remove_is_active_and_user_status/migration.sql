/*
  Warnings:

  - You are about to drop the column `isActive` on the `GroomingService` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Pet` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GroomingService" DROP COLUMN "isActive";

-- AlterTable
ALTER TABLE "Pet" DROP COLUMN "isActive";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "status";

-- DropEnum
DROP TYPE "UserStatus";
