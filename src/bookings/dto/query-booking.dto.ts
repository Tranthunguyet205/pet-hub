import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BookingStatus, BookingType, PaymentStatus } from '@prisma/client';

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
      'status phải là một trong các giá trị: PENDING, CONFIRMED, CHECKED_IN, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW',
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

  @ApiPropertyOptional({
    description:
      'Lọc theo ID nhân viên được phân công (trả về booking có ít nhất 1 dịch vụ assign cho staff này)',
    example: 3,
  })
  @Type(() => Number)
  @IsInt({ message: 'staffId phải là số nguyên' })
  @IsOptional()
  staffId?: number;

  @ApiPropertyOptional({
    description:
      'Lọc các đơn có expectedCheckInDate từ thời điểm này trở đi (ISO-8601). ' +
      'Nếu chỉ truyền ngày (YYYY-MM-DD) sẽ được hiểu là 00:00 của ngày đó.',
    example: '2026-11-13',
  })
  @IsDateString(
    {},
    { message: 'from phải là chuỗi ngày hợp lệ (ISO-8601 hoặc YYYY-MM-DD)' },
  )
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({
    description:
      'Lọc các đơn có expectedCheckInDate đến trước thời điểm này (ISO-8601). ' +
      'Nếu chỉ truyền ngày (YYYY-MM-DD) sẽ được hiểu là hết ngày đó (23:59:59.999).',
    example: '2026-11-13',
  })
  @IsDateString(
    {},
    { message: 'to phải là chuỗi ngày hợp lệ (ISO-8601 hoặc YYYY-MM-DD)' },
  )
  @IsOptional()
  to?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái thanh toán',
    enum: PaymentStatus,
    example: PaymentStatus.UNPAID,
  })
  @IsEnum(PaymentStatus, {
    message: 'paymentStatus phải là một trong các giá trị: UNPAID, PAID, REFUNDED',
  })
  @IsOptional()
  paymentStatus?: PaymentStatus;
}
