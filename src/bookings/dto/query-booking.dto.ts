import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { BookingStatus, BookingType } from '@prisma/client';

export class QueryBookingDto {
  @ApiPropertyOptional({
    description: 'Số trang hiện tại (bắt đầu từ 1)',
    default: 1,
    example: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'Page phải là số nguyên' })
  @Min(1, { message: 'Page tối thiểu là 1' })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số lượng bản ghi trên một trang',
    default: 10,
    example: 10,
  })
  @Type(() => Number)
  @IsInt({ message: 'Limit phải là số nguyên' })
  @Min(1, { message: 'Limit tối thiểu là 1' })
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái đơn đặt lịch',
    enum: BookingStatus,
    example: BookingStatus.PENDING,
  })
  @IsEnum(BookingStatus, {
    message:
      'status phải là một trong các giá trị: PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED',
  })
  @IsOptional()
  status?: BookingStatus;

  @ApiPropertyOptional({
    description: 'Lọc theo loại hình booking (GROOMING hoặc BOARDING)',
    enum: BookingType,
    example: BookingType.GROOMING,
  })
  @IsEnum(BookingType, {
    message: 'bookingType phải là GROOMING hoặc BOARDING',
  })
  @IsOptional()
  bookingType?: BookingType;

  @ApiPropertyOptional({
    description: 'Lọc theo ID thú cưng',
    example: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'petId phải là số nguyên' })
  @IsOptional()
  petId?: number;

  @ApiPropertyOptional({
    description:
      'Lọc theo ID khách hàng (Chỉ áp dụng với ADMIN và STAFF. Với OWNER luôn tự động lọc theo ID của mình)',
    example: 2,
  })
  @Type(() => Number)
  @IsInt({ message: 'userId phải là số nguyên' })
  @IsOptional()
  userId?: number;

  @ApiPropertyOptional({
    description:
      'Từ khóa tìm kiếm (theo tên thú cưng, tên khách hàng, số điện thoại hoặc email)',
    example: 'Miu',
  })
  @IsString({ message: 'search phải là chuỗi ký tự' })
  @IsOptional()
  search?: string;
}
