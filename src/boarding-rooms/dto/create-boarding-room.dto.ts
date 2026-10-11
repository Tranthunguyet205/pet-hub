import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RoomStatus } from '@prisma/client';

export class CreateBoardingRoomDto {
  @ApiProperty({
    description: 'Tên phòng hoặc chuồng lưu trú (Unique)',
    example: 'Phòng VIP 03',
  })
  @IsString({ message: 'name phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'name không được để trống' })
  name: string;

  @ApiProperty({
    description: 'Mô tả tiện ích, trang thiết bị của phòng',
    example: 'Phòng VIP máy lạnh 24/7, đệm êm, camera giám sát',
  })
  @IsString({ message: 'description phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'description không được để trống' })
  description: string;

  @ApiProperty({
    description: 'Đơn giá lưu trú theo giờ (VNĐ/giờ)',
    example: 60000,
  })
  @Type(() => Number)
  @IsInt({ message: 'pricePerHour phải là số nguyên' })
  @Min(0, { message: 'pricePerHour không được âm' })
  pricePerHour: number;

  @ApiPropertyOptional({
    description: 'Trạng thái ban đầu của phòng (mặc định AVAILABLE)',
    enum: RoomStatus,
    default: RoomStatus.AVAILABLE,
    example: RoomStatus.AVAILABLE,
  })
  @IsOptional()
  @IsEnum(RoomStatus, {
    message: 'status phải là một trong các giá trị: AVAILABLE, OCCUPIED, MAINTENANCE',
  })
  status?: RoomStatus;
}
