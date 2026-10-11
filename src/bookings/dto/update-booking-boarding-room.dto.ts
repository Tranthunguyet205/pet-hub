import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateBookingBoardingRoomDto {
  @ApiPropertyOptional({
    description: 'Đơn giá lưu trú theo giờ mới (VNĐ/giờ)',
    example: 60000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pricePerHour phải là số nguyên' })
  @Min(0, { message: 'pricePerHour không được âm' })
  pricePerHour?: number;
}
