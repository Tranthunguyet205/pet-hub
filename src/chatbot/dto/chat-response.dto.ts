import { ApiProperty } from '@nestjs/swagger';

export class ChatResponseDto {
  @ApiProperty({
    description: 'Nội dung câu trả lời tư vấn từ AI Chatbot',
    example:
      'Đối với cún 3 tháng tuổi, hệ tiêu hóa còn non nớt nên bạn hãy ưu tiên các dòng hạt chuyên dụng...',
  })
  reply: string;

  @ApiProperty({
    description: 'Thời điểm tạo câu trả lời (định dạng ISO 8601)',
    example: '2026-11-17T12:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Tên model AI Gemini đã sử dụng để tạo câu trả lời',
    example: 'gemini-1.5-flash',
  })
  model: string;
}
