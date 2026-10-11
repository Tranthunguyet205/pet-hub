import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBookingBoardingRoomDto {
  @ApiProperty({
    description: 'ID của đơn đặt lịch (Booking) loại BOARDING',
    example: 2,
  })
  @Type(() => Number)
  @IsInt({ message: 'bookingId phải là số nguyên' })
  @IsNotEmpty({ message: 'bookingId không được để trống' })
  bookingId: number;

  @ApiProperty({
    description:
      'ID của phòng lưu trú (BoardingRoom). Đơn giá theo giờ (pricePerHour) sẽ tự động lấy từ phòng này.',
    example: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'boardingRoomId phải là số nguyên' })
  @IsNotEmpty({ message: 'boardingRoomId không được để trống' })
  boardingRoomId: number;
}
