import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Role, UserStatus } from '@prisma/client';

export class QueryUserDto {
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
    description: 'Từ khóa tìm kiếm (theo họ tên, email hoặc số điện thoại)',
    example: 'nguyen',
  })
  @IsString({ message: 'Search phải là chuỗi ký tự' })
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo vai trò người dùng',
    enum: Role,
  })
  @IsEnum(Role, { message: 'Role không hợp lệ' })
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái tài khoản',
    enum: UserStatus,
  })
  @IsEnum(UserStatus, { message: 'Status không hợp lệ' })
  @IsOptional()
  status?: UserStatus;
}
