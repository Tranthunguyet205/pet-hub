import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBookingServiceDto {
  @ApiProperty({
    description: 'ID của đơn đặt lịch (Booking)',
    example: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'bookingId phải là số nguyên' })
  @IsNotEmpty({ message: 'bookingId không được để trống' })
  bookingId: number;

  @ApiProperty({
    description:
      'ID của dịch vụ (Service). Đơn giá (price) sẽ tự động lấy từ giá gốc (basePrice) của dịch vụ này.',
    example: 2,
  })
  @Type(() => Number)
  @IsInt({ message: 'serviceId phải là số nguyên' })
  @IsNotEmpty({ message: 'serviceId không được để trống' })
  serviceId: number;

  @ApiPropertyOptional({
    description: 'ID của nhân viên phụ trách dịch vụ (nếu có)',
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'staffId phải là số nguyên' })
  staffId?: number;
}
