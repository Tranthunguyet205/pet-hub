import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RoomStatus } from '@prisma/client';

export class UpdateBoardingRoomDto {
  @ApiPropertyOptional({
    description: 'Tên phòng hoặc chuồng lưu trú (Unique)',
    example: 'Phòng VIP 03 Updated',
  })
  @IsOptional()
  @IsString({ message: 'name phải là chuỗi ký tự' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Mô tả tiện ích, trang thiết bị của phòng',
    example: 'Cập nhật tiện ích mới kèm máy lọc không khí',
  })
  @IsOptional()
  @IsString({ message: 'description phải là chuỗi ký tự' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Đơn giá lưu trú theo giờ mới (VNĐ/giờ)',
    example: 65000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pricePerHour phải là số nguyên' })
  @Min(0, { message: 'pricePerHour không được âm' })
  pricePerHour?: number;

  @ApiPropertyOptional({
    description: 'Trạng thái hoạt động của phòng',
    enum: RoomStatus,
    example: RoomStatus.MAINTENANCE,
  })
  @IsOptional()
  @IsEnum(RoomStatus, {
    message: 'status phải là một trong các giá trị: AVAILABLE, OCCUPIED, MAINTENANCE',
  })
  status?: RoomStatus;
}
