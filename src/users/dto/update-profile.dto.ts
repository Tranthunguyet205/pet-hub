import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'Họ và tên đầy đủ',
    example: 'Nguyễn Văn An',
  })
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự' })
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại liên hệ',
    example: '0987654321',
  })
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Tệp ảnh đại diện mới (avatar)',
  })
  @IsOptional()
  avatar?: any;
}
