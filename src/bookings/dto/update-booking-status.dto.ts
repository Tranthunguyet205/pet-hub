import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { BookingStatus } from '@prisma/client';

export class UpdateBookingStatusDto {
  @ApiProperty({
    description: 'Trạng thái mới của đơn đặt lịch',
    enum: BookingStatus,
    example: BookingStatus.CONFIRMED,
  })
  @IsEnum(BookingStatus, {
    message:
      'status phải là một trong các giá trị: PENDING, CONFIRMED, CHECKED_IN, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW',
  })
  @IsNotEmpty({ message: 'status không được để trống' })
  status: BookingStatus;

  @ApiPropertyOptional({
    description: 'Lý do hủy đơn (chỉ dùng khi status = CANCELLED)',
    example: 'Chủ nuôi bận đột xuất',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'cancelReason phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'cancelReason không được vượt quá 500 ký tự' })
  cancelReason?: string;
}
