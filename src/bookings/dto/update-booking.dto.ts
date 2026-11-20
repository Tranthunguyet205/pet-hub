import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Sửa thông tin đơn đặt lịch (đổi lịch hẹn / ghi chú / danh sách dịch vụ).
 * Không dùng để đổi trạng thái — việc đó đi qua PATCH /bookings/:id/status.
 */
export class UpdateBookingDto {
  @ApiPropertyOptional({
    description: 'Ngày giờ nhận thú cưng dự kiến (ISO-8601)',
    example: '2026-12-01T02:00:00.000Z',
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
    description: 'Ngày giờ trả thú cưng dự kiến (ISO-8601)',
    example: '2026-12-03T10:00:00.000Z',
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
    description: 'Ghi chú của chủ nuôi (gửi chuỗi rỗng để xóa ghi chú)',
    example: 'Đổi sang buổi chiều giúp em.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'notes phải là chuỗi ký tự' })
  @MaxLength(1000, { message: 'notes không được vượt quá 1000 ký tự' })
  notes?: string;

  @ApiPropertyOptional({
    description:
      'Danh sách ID dịch vụ mới. Nếu truyền, toàn bộ dịch vụ do khách chọn sẽ được thay thế ' +
      '(hai bước hệ thống CHECK_IN và CHECK_OUT luôn được giữ nguyên).',
    example: [2, 3],
    type: [Number],
  })
  @IsOptional()
  @IsArray({ message: 'serviceIds phải là một mảng' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'Mỗi serviceId phải là số nguyên' })
  serviceIds?: number[];
}
