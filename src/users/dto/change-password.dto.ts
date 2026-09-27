import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Mật khẩu hiện tại của bạn',
    example: 'OldPassword123@',
  })
  @IsString({ message: 'Mật khẩu cũ phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mật khẩu cũ không được để trống' })
  oldPassword: string;

  @ApiProperty({
    description: 'Mật khẩu mới (tối thiểu 6 ký tự)',
    example: 'NewPassword123@',
    minLength: 6,
  })
  @IsString({ message: 'Mật khẩu mới phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @MinLength(6, { message: 'Mật khẩu mới phải có tối thiểu 6 ký tự' })
  newPassword: string;
}
