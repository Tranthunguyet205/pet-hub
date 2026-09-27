-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF', 'OWNER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BANNED');

-- CreateEnum
CREATE TYPE "PetGender" AS ENUM ('MALE', 'FEMALE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "GroomingServiceCategory" AS ENUM ('BATH_AND_DRY', 'HAIRCUT', 'HYGIENE', 'FULL_GROOMING', 'OTHER');

-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('GROOMING', 'BOARDING');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "avatarUrl" TEXT,
    "role" "Role" NOT NULL DEFAULT 'OWNER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "isDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pet" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "breed" TEXT,
    "gender" "PetGender" NOT NULL DEFAULT 'UNKNOWN',
    "birthDate" TIMESTAMP(3),
    "weight" DOUBLE PRECISION NOT NULL,
    "avatarUrl" TEXT,
    "allergyNotes" TEXT,
    "specialNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroomingService" (
    "id" SERIAL NOT NULL,
    "category" "GroomingServiceCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "basePrice" DECIMAL(12,2) NOT NULL,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroomingService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "petId" INTEGER NOT NULL,
    "staffId" INTEGER,
    "bookingType" "BookingType" NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "expectedBookingDate" TIMESTAMP(3),
    "groomingStep" "GroomingServiceCategory",
    "expectedCheckInDate" TIMESTAMP(3),
    "expectedCheckOutDate" TIMESTAMP(3),
    "isDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingGroomingService" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "groomingServiceId" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,

    CONSTRAINT "BookingGroomingService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingBoardingRoom" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "boardingRoomId" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "BookingBoardingRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingLog" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "petId" INTEGER NOT NULL,
    "staffId" INTEGER,
    "bookingType" "BookingType" NOT NULL,
    "status" "BookingStatus" NOT NULL,
    "expectedBookingDate" TIMESTAMP(3),
    "groomingStep" "GroomingServiceCategory",
    "expectedCheckInDate" TIMESTAMP(3),
    "expectedCheckOutDate" TIMESTAMP(3),
    "isDelete" BOOLEAN NOT NULL DEFAULT false,
    "action" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardingRoom" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pricePerNight" DECIMAL(12,2) NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "isDelete" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BoardingRoom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- CreateIndex
CREATE INDEX "Pet_userId_idx" ON "Pet"("userId");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE INDEX "Booking_staffId_idx" ON "Booking"("staffId");

-- CreateIndex
CREATE INDEX "Booking_expectedBookingDate_status_idx" ON "Booking"("expectedBookingDate", "status");

-- CreateIndex
CREATE INDEX "BookingGroomingService_bookingId_idx" ON "BookingGroomingService"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingBoardingRoom_bookingId_key" ON "BookingBoardingRoom"("bookingId");

-- CreateIndex
CREATE INDEX "BookingBoardingRoom_boardingRoomId_idx" ON "BookingBoardingRoom"("boardingRoomId");

-- CreateIndex
CREATE INDEX "BookingLog_bookingId_changedAt_idx" ON "BookingLog"("bookingId", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BoardingRoom_name_key" ON "BoardingRoom"("name");

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingGroomingService" ADD CONSTRAINT "BookingGroomingService_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingGroomingService" ADD CONSTRAINT "BookingGroomingService_groomingServiceId_fkey" FOREIGN KEY ("groomingServiceId") REFERENCES "GroomingService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingBoardingRoom" ADD CONSTRAINT "BookingBoardingRoom_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingBoardingRoom" ADD CONSTRAINT "BookingBoardingRoom_boardingRoomId_fkey" FOREIGN KEY ("boardingRoomId") REFERENCES "BoardingRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingLog" ADD CONSTRAINT "BookingLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
