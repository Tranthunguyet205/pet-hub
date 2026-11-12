import { IsDateString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BookingType } from '@prisma/client';

export class QueryAvailabilityDto {
  @ApiProperty({
    description: 'Ngày cần kiểm tra (YYYY-MM-DD)',
    example: '2026-11-15',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Loại booking (GROOMING hoặc BOARDING)',
    enum: BookingType,
    required: false,
  })
  @IsOptional()
  @IsEnum(BookingType)
  bookingType?: BookingType;
}
