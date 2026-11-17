import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class ChatMessageDto {
  @ApiProperty({
    description: 'Vai trò người gửi: user (người dùng) hoặc model (AI bot)',
    example: 'user',
    enum: ['user', 'model'],
  })
  @IsString({ message: 'role phải là chuỗi ký tự' })
  @IsIn(['user', 'model'], { message: 'role chỉ được nhận giá trị user hoặc model' })
  @IsNotEmpty({ message: 'role không được để trống' })
  role: 'user' | 'model';

  @ApiProperty({
    description: 'Nội dung tin nhắn trong đoạn hội thoại',
    example: 'Chó nhà tôi bị nôn, cần sơ cứu thế nào?',
  })
  @IsString({ message: 'content phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'content không được để trống' })
  content: string;
}
