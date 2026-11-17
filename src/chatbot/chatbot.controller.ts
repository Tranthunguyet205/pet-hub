import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChatbotService } from './chatbot.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Chatbot')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Gửi tin nhắn tư vấn chăm sóc thú cưng tới PetHub AI Chatbot',
    description:
      'Nhận tin nhắn của người dùng kèm lịch sử hội thoại tùy chọn (stateless), gửi tới Google Gemini API và trả về lời khuyên chăm sóc thú cưng.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tư vấn thành công từ AI Chatbot',
    type: ChatResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dữ liệu đầu vào không hợp lệ (Validation failed)',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Chưa đăng nhập hoặc Token JWT không hợp lệ',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Chưa kích hoạt hoặc chưa cấu hình GEMINI_API_KEY trên server',
  })
  @ApiResponse({
    status: HttpStatus.BAD_GATEWAY,
    description: 'Không thể kết nối đến dịch vụ AI Chatbot của Google',
  })
  async chat(@Body() chatRequestDto: ChatRequestDto): Promise<ChatResponseDto> {
    return this.chatbotService.sendMessage(chatRequestDto);
  }
}
