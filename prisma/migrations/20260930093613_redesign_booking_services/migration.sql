/*
  Warnings:

  - You are about to drop the column `pricePerNight` on the `BoardingRoom` table. All the data in the column will be lost.
  - You are about to drop the column `expectedBookingDate` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `groomingStep` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `staffId` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Booking` table. All the data in the column will be lost.
  - You are about to alter the column `price` on the `BookingBoardingRoom` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Integer`.
  - You are about to drop the `BookingGroomingService` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BookingLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GroomingService` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `pricePerHour` to the `BoardingRoom` table without a default value. This is not possible if the table is not empty.
  - Made the column `description` on table `BoardingRoom` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('CHECK_IN', 'BATH_AND_DRY', 'HAIRCUT', 'HYGIENE', 'FULL_GROOMING', 'CHECK_OUT');

-- CreateEnum
CREATE TYPE "ServiceItemStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_staffId_fkey";

-- DropForeignKey
ALTER TABLE "BookingGroomingService" DROP CONSTRAINT "BookingGroomingService_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "BookingGroomingService" DROP CONSTRAINT "BookingGroomingService_groomingServiceId_fkey";

-- DropForeignKey
ALTER TABLE "BookingLog" DROP CONSTRAINT "BookingLog_bookingId_fkey";

-- DropIndex
DROP INDEX "Booking_expectedBookingDate_status_idx";

-- DropIndex
DROP INDEX "Booking_staffId_idx";

-- AlterTable
ALTER TABLE "BoardingRoom" DROP COLUMN "pricePerNight",
ADD COLUMN     "pricePerHour" INTEGER NOT NULL,
ALTER COLUMN "description" SET NOT NULL;

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "expectedBookingDate",
DROP COLUMN "groomingStep",
DROP COLUMN "staffId",
DROP COLUMN "status";

-- AlterTable
ALTER TABLE "BookingBoardingRoom" ALTER COLUMN "price" SET DATA TYPE INTEGER;

-- DropTable
DROP TABLE "BookingGroomingService";

-- DropTable
DROP TABLE "BookingLog";

-- DropTable
DROP TABLE "GroomingService";

-- DropEnum
DROP TYPE "BookingStatus";

-- DropEnum
DROP TYPE "GroomingServiceCategory";

-- CreateTable
CREATE TABLE "Service" (
    "id" SERIAL NOT NULL,
    "category" "ServiceCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "basePrice" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "isDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingService" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "staffId" INTEGER,
    "actualStartTime" TIMESTAMP(3),
    "actualEndTime" TIMESTAMP(3),
    "status" "ServiceItemStatus" NOT NULL DEFAULT 'PENDING',
    "price" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingService_bookingId_idx" ON "BookingService"("bookingId");

-- CreateIndex
CREATE INDEX "BookingService_staffId_idx" ON "BookingService"("staffId");

-- CreateIndex
CREATE INDEX "Booking_petId_idx" ON "Booking"("petId");

-- CreateIndex
CREATE INDEX "Booking_bookingType_idx" ON "Booking"("bookingType");

-- AddForeignKey
ALTER TABLE "BookingService" ADD CONSTRAINT "BookingService_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingService" ADD CONSTRAINT "BookingService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingService" ADD CONSTRAINT "BookingService_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
