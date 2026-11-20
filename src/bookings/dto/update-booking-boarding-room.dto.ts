import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateBookingBoardingRoomDto {
  @ApiPropertyOptional({
    description:
      'ID phòng lưu trú mới (dùng để đổi phòng cho đơn). ' +
      'Nếu truyền, đơn giá sẽ tự lấy theo giá của phòng mới, trừ khi pricePerNight cũng được truyền.',
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'boardingRoomId phải là số nguyên' })
  @Min(1, { message: 'boardingRoomId phải lớn hơn 0' })
  boardingRoomId?: number;

  @ApiPropertyOptional({
    description: 'Đơn giá lưu trú theo đêm mới (VNĐ/đêm)',
    example: 60000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pricePerNight phải là số nguyên' })
  @Min(0, { message: 'pricePerNight không được âm' })
  pricePerNight?: number;
}
