-- Đổi đơn giá phòng lưu trú từ theo GIỜ sang theo ĐÊM.
--
-- Dùng RENAME COLUMN thay vì DROP + ADD (mặc định Prisma sinh ra) để giữ nguyên
-- dữ liệu giá đang có. Giá trị số không được quy đổi ở đây — phải định giá lại
-- cho đúng đơn vị đêm (xem prisma/seed.ts), vì 80.000/giờ không phải 80.000/đêm.
--
-- BoardingRoom.pricePerNight        : giá niêm yết của phòng
-- BookingBoardingRoom.pricePerNight : giá chốt tại thời điểm gán phòng vào đơn

ALTER TABLE "BoardingRoom" RENAME COLUMN "pricePerHour" TO "pricePerNight";
ALTER TABLE "BookingBoardingRoom" RENAME COLUMN "pricePerHour" TO "pricePerNight";
