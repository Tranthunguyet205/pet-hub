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
import { ServiceCategory } from '@prisma/client';

export class CreateServiceDto {
  @ApiProperty({
    description: 'Tên dịch vụ',
    example: 'Tắm khoáng thảo dược cao cấp',
  })
  @IsNotEmpty({ message: 'Tên dịch vụ không được để trống' })
  @IsString({ message: 'Tên dịch vụ phải là chuỗi ký tự' })
  name: string;

  @ApiProperty({
    description:
      'Phân loại dịch vụ (Lưu ý: Không được chọn CHECK_IN hoặc CHECK_OUT vì đây là dịch vụ hệ thống cố định)',
    enum: ServiceCategory,
    example: ServiceCategory.BATH_AND_DRY,
  })
  @IsNotEmpty({ message: 'Phân loại dịch vụ không được để trống' })
  @IsEnum(ServiceCategory, { message: 'Phân loại dịch vụ (category) không hợp lệ' })
  category: ServiceCategory;

  @ApiPropertyOptional({
    description: 'Mô tả chi tiết quy trình hoặc dịch vụ',
    example: 'Ngâm bồn sục khoáng thảo dược giúp thải độc da và làm mượt lông.',
  })
  @IsOptional()
  @IsString({ message: 'Mô tả dịch vụ phải là chuỗi ký tự' })
  description?: string;

  @ApiProperty({
    description: 'Thời lượng ước tính thực hiện dịch vụ (phút)',
    example: 45,
  })
  @IsNotEmpty({ message: 'Thời lượng thực hiện không được để trống' })
  @Type(() => Number)
  @IsInt({ message: 'Thời lượng thực hiện phải là số nguyên' })
  @Min(1, { message: 'Thời lượng thực hiện tối thiểu là 1 phút' })
  durationMinutes: number;

  @ApiProperty({
    description: 'Giá dịch vụ cơ bản (VNĐ)',
    example: 200000,
  })
  @IsNotEmpty({ message: 'Giá dịch vụ cơ bản không được để trống' })
  @Type(() => Number)
  @IsInt({ message: 'Giá dịch vụ phải là số nguyên' })
  @Min(0, { message: 'Giá dịch vụ không được âm' })
  basePrice: number;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Hình ảnh minh họa dịch vụ (JPG, JPEG, PNG, WEBP tối đa 5MB)',
  })
  image?: any;
}
