import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RoomStatus } from '@prisma/client';

export class QueryBoardingRoomDto {
  @ApiPropertyOptional({
    description: 'Số trang hiện tại (mặc định: 1)',
    default: 1,
    example: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'page phải là số nguyên' })
  @Min(1, { message: 'page tối thiểu là 1' })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số lượng bản ghi trên một trang (mặc định: 10)',
    default: 10,
    example: 10,
  })
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1, { message: 'limit tối thiểu là 1' })
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm theo tên hoặc mô tả phòng',
    example: 'VIP',
  })
  @IsOptional()
  @IsString({ message: 'search phải là chuỗi ký tự' })
  search?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái phòng',
    enum: RoomStatus,
    example: RoomStatus.AVAILABLE,
  })
  @IsOptional()
  @IsEnum(RoomStatus, {
    message: 'status phải là một trong các giá trị: AVAILABLE, OCCUPIED, MAINTENANCE',
  })
  status?: RoomStatus;
}
