import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Họ và tên đầy đủ',
    example: 'Nguyễn Văn An (Updated)',
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
    description: 'Chuyên môn của người dùng',
    example: 'Thú y',
  })
  @IsString({ message: 'Chuyên môn phải là chuỗi ký tự' })
  @IsOptional()
  specialty?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Tệp ảnh đại diện mới (avatar)',
  })
  @IsOptional()
  avatar?: any;

  @ApiPropertyOptional({
    description: 'Vai trò tài khoản (chỉ ADMIN có quyền sửa)',
    enum: Role,
    example: Role.STAFF,
  })
  @IsEnum(Role, { message: 'Vai trò phải là ADMIN, STAFF hoặc OWNER' })
  @IsOptional()
  role?: Role;
}
