import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { BookingStatus } from '@prisma/client';

export class UpdateBookingStatusDto {
  @ApiProperty({
    description: 'Trạng thái mới của đơn đặt lịch',
    enum: BookingStatus,
    example: BookingStatus.CONFIRMED,
  })
  @IsEnum(BookingStatus, {
    message:
      'status phải là một trong các giá trị: PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED',
  })
  @IsNotEmpty({ message: 'status không được để trống' })
  status: BookingStatus;
}
