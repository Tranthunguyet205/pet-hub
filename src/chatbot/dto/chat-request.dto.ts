import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ChatMessageDto } from './chat-message.dto';

export class ChatRequestDto {
  @ApiProperty({
    description: 'Tin nhắn câu hỏi hoặc yêu cầu tư vấn mới nhất của người dùng',
    example: 'Cún cưng 3 tháng tuổi thì nên cho ăn loại hạt nào tốt cho tiêu hóa?',
  })
  @IsString({ message: 'message phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'message không được để trống' })
  message: string;

  @ApiPropertyOptional({
    description: 'Lịch sử cuộc hội thoại trước đó để bot ghi nhớ ngữ cảnh',
    type: [ChatMessageDto],
  })
  @IsOptional()
  @IsArray({ message: 'history phải là một mảng tin nhắn' })
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  history?: ChatMessageDto[];
}
