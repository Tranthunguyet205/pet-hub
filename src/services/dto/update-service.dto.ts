import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateServiceDto {
  @ApiPropertyOptional({
    description: 'Tên dịch vụ',
    example: 'Tắm sấy khử mùi & Dưỡng lông cao cấp',
  })
  @IsOptional()
  @IsString({ message: 'Tên dịch vụ phải là chuỗi ký tự' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Mô tả chi tiết quy trình hoặc dịch vụ',
    example: 'Sử dụng dầu tắm cao cấp hữu cơ, sấy tạo kiểu bồng bềnh và dưỡng lông suôn mượt.',
  })
  @IsOptional()
  @IsString({ message: 'Mô tả dịch vụ phải là chuỗi ký tự' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Thời lượng ước tính thực hiện dịch vụ (phút)',
    example: 60,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Thời lượng thực hiện phải là số nguyên' })
  @Min(1, { message: 'Thời lượng thực hiện tối thiểu là 1 phút' })
  durationMinutes?: number;

  @ApiPropertyOptional({
    description: 'Giá dịch vụ cơ bản (VNĐ)',
    example: 180000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Giá dịch vụ phải là số nguyên' })
  @Min(0, { message: 'Giá dịch vụ không được âm' })
  basePrice?: number;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Hình ảnh minh họa dịch vụ (JPG, JPEG, PNG, WEBP tối đa 5MB)',
  })
  image?: any;
}
