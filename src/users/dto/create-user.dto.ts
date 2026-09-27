import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({
    description: 'Địa chỉ email người dùng',
    example: 'staff.nguyen@pethub.com',
  })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({
    description: 'Mật khẩu khởi tạo (tối thiểu 6 ký tự)',
    example: 'StaffPassword123@',
    minLength: 6,
  })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải có tối thiểu 6 ký tự' })
  password: string;

  @ApiProperty({
    description: 'Họ và tên đầy đủ',
    example: 'Nguyễn Văn An',
  })
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  fullName: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại liên hệ',
    example: '0912345678',
  })
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Vai trò người dùng trong hệ thống',
    enum: Role,
    default: Role.OWNER,
    example: Role.STAFF,
  })
  @IsEnum(Role, { message: 'Vai trò phải là ADMIN, STAFF hoặc OWNER' })
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Tệp ảnh đại diện (avatar)',
  })
  @IsOptional()
  avatar?: any;
}
