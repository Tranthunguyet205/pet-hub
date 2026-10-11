import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsInt,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BookingType } from '@prisma/client';
import { IsOwnerUser } from '../../common/validators/is-owner-user.validator';

export class CreateBookingDto {
  @ApiProperty({
    description: 'ID của thú cưng cần đặt lịch',
    example: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'petId phải là số nguyên' })
  @IsNotEmpty({ message: 'petId không được để trống' })
  petId: number;

  @ApiProperty({
    description: 'Loại hình booking (GROOMING hoặc BOARDING)',
    enum: BookingType,
    example: BookingType.GROOMING,
  })
  @IsEnum(BookingType, {
    message: 'bookingType phải là GROOMING hoặc BOARDING',
  })
  @IsNotEmpty({ message: 'bookingType không được để trống' })
  bookingType: BookingType;

  @ApiPropertyOptional({
    description:
      'ID chủ sở hữu (Chỉ ADMIN hoặc STAFF truyền để tạo hộ khách hàng. Nếu không truyền, hệ thống tự động gán theo chủ sở hữu của thú cưng)',
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'userId phải là số nguyên' })
  @IsOwnerUser({
    message:
      'Người dùng (userId) không tồn tại hoặc không phải là khách hàng có vai trò OWNER',
  })
  userId?: number;

  @ApiPropertyOptional({
    description:
      'Thời gian dự kiến check-in (Định dạng ISO 8601: YYYY-MM-DDTHH:mm:ssZ)',
    example: '2026-10-15T09:00:00.000Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    {
      message:
        'expectedCheckInDate phải đúng định dạng ngày giờ hợp lệ ISO 8601',
    },
  )
  expectedCheckInDate?: string;

  @ApiPropertyOptional({
    description:
      'Thời gian dự kiến check-out (Định dạng ISO 8601: YYYY-MM-DDTHH:mm:ssZ)',
    example: '2026-10-15T11:30:00.000Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    {
      message:
        'expectedCheckOutDate phải đúng định dạng ngày giờ hợp lệ ISO 8601',
    },
  )
  expectedCheckOutDate?: string;

  @ApiPropertyOptional({
    description:
      'Danh sách ID các dịch vụ đi kèm (chỉ thuộc 4 loại: BATH_AND_DRY, HAIRCUT, HYGIENE, FULL_GROOMING). Bắt buộc tối thiểu 1 dịch vụ với GROOMING, tùy chọn với BOARDING.',
    type: [Number],
    example: [2, 3],
  })
  @IsOptional()
  @IsArray({ message: 'serviceIds phải là một danh sách' })
  @IsInt({ each: true, message: 'Mỗi phần tử trong serviceIds phải là số nguyên' })
  serviceIds?: number[];
}
