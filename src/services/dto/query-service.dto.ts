import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceCategory } from '@prisma/client';

export class QueryServiceDto {
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
    description: 'Từ khóa tìm kiếm theo tên hoặc mô tả dịch vụ',
    example: 'Tắm sấy',
  })
  @IsString({ message: 'Search phải là chuỗi ký tự' })
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo phân loại dịch vụ',
    enum: ServiceCategory,
    example: ServiceCategory.BATH_AND_DRY,
  })
  @IsEnum(ServiceCategory, { message: 'Category không hợp lệ' })
  @IsOptional()
  category?: ServiceCategory;
}
