/*
  Warnings:

  - You are about to drop the column `price` on the `BookingBoardingRoom` table. All the data in the column will be lost.
  - Added the required column `pricePerHour` to the `BookingBoardingRoom` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BookingBoardingRoom" DROP COLUMN "price",
ADD COLUMN     "pricePerHour" INTEGER NOT NULL;
