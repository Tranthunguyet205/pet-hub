import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsDateString,
  Min,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceItemStatus } from '@prisma/client';

export class UpdateBookingServiceDto {
  @ApiPropertyOptional({
    description:
      'Thời gian thực tế bắt đầu thực hiện dịch vụ (ISO 8601: YYYY-MM-DDTHH:mm:ssZ)',
    example: '2026-10-15T09:15:00.000Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'actualStartTime phải đúng định dạng ngày giờ hợp lệ ISO 8601' },
  )
  actualStartTime?: string;

  @ApiPropertyOptional({
    description:
      'Thời gian thực tế hoàn thành dịch vụ (ISO 8601: YYYY-MM-DDTHH:mm:ssZ)',
    example: '2026-10-15T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'actualEndTime phải đúng định dạng ngày giờ hợp lệ ISO 8601' },
  )
  actualEndTime?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái thực hiện dịch vụ',
    enum: ServiceItemStatus,
    example: ServiceItemStatus.IN_PROGRESS,
  })
  @IsOptional()
  @IsEnum(ServiceItemStatus, {
    message:
      'status phải là một trong các giá trị: PENDING, IN_PROGRESS, COMPLETED',
  })
  status?: ServiceItemStatus;

  @ApiPropertyOptional({
    description:
      'Đường dẫn hình ảnh kết quả/tiến độ dịch vụ (có thể gửi URL hoặc upload file multipart/form-data). ' +
      'Không gửi trường này -> giữ nguyên ảnh hiện tại. Gửi chuỗi rỗng -> gỡ ảnh.',
    example: 'files/bookingServices/booking-service-12345.jpg',
  })
  @IsOptional()
  @IsString({ message: 'imageUrl phải là chuỗi ký tự' })
  imageUrl?: string;

  @ApiPropertyOptional({
    description:
      'Ghi chú chăm sóc cho bước dịch vụ này (gửi chuỗi rỗng để xóa ghi chú)',
    example: 'Bé hơi nhát nước, tai trái hơi đỏ cần theo dõi',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'notes phải là chuỗi ký tự' })
  @MaxLength(1000, { message: 'notes không được vượt quá 1000 ký tự' })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Giá dịch vụ (VNĐ)',
    example: 180000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'price phải là số nguyên' })
  @Min(0, { message: 'price không được âm' })
  price?: number;

  @ApiPropertyOptional({
    description: 'ID nhân viên phụ trách thực hiện dịch vụ này (phân công hoặc tự nhận việc)',
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'staffId phải là số nguyên' })
  staffId?: number;
}
