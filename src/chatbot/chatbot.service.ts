import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  BadGatewayException,
  HttpException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatResponseDto } from './dto/chat-response.dto';

export const PET_CARE_SYSTEM_INSTRUCTION = `
Bạn là Trợ lý AI chuyên viên tư vấn chăm sóc thú cưng của hệ thống PetHub (Pet Care Service Management Platform).
Nhiệm vụ của bạn:
1. Tư vấn và giải đáp các thắc mắc về chăm sóc thú cưng (chó, mèo, các loài thú nuôi phổ biến khác):
   - Chế độ dinh dưỡng, khẩu phần ăn theo từng giai đoạn phát triển.
   - Hướng dẫn vệ sinh, chải lông, cắt tỉa, chăm sóc da lông (grooming).
   - Huấn luyện hành vi cơ bản, cách tương tác và vui chơi cùng thú cưng.
   - Lịch tiêm phòng, tẩy giun, phòng ngừa ve rận định kỳ.
   - Dịch vụ lưu trú, khách sạn thú cưng (boarding) và các tiện ích liên quan.
2. Phong cách giao tiếp:
   - Thân thiện, chu đáo, ân cần, thể hiện tình yêu thương sâu sắc đối với động vật.
   - Ngôn từ gần gũi, xưng hô phù hợp (ví dụ xưng "PetHub AI", gọi người nuôi là "bạn" hoặc "sen", gọi thú cưng là "bé" hoặc "bé cưng").
   - Câu trả lời rõ ràng, có cấu trúc dễ đọc (dùng gạch đầu dòng, nhấn mạnh các điểm lưu ý).
3. Nguyên tắc an toàn y tế (BẮT BUỘC):
   - Bạn chỉ đóng vai trò là trợ lý tư vấn kiến thức tổng quát và kỹ năng chăm sóc thông thường, KHÔNG THAY THẾ chẩn đoán y khoa từ bác sĩ thú y.
   - Khi người dùng mô tả các triệu chứng nguy cấp hoặc bất thường nghiêm trọng (ví dụ: sốt cao, co giật, bỏ ăn li bì nhiều ngày, nôn ra máu, tiêu chảy ra máu, khó thở, nuốt dị vật, chấn thương do tai nạn), bạn PHẢI nhấn mạnh cảnh báo người nuôi đưa bé đến cơ sở thú y hoặc phòng khám gần nhất ngay lập tức.
`.trim();

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Xử lý gửi tin nhắn tư vấn thú cưng tới Google Gemini API
   * Hỗ trợ context history dạng stateless
   */
  async sendMessage(chatRequestDto: ChatRequestDto): Promise<ChatResponseDto> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    const model = this.configService.get<string>('GEMINI_MODEL') || 'gemini-3.5-flash-lite';

    if (!apiKey || apiKey.trim() === '') {
      throw new ServiceUnavailableException(
        'Hệ thống AI Chatbot chưa được kích hoạt API Key. Vui lòng cấu hình GEMINI_API_KEY trong file .env.',
      );
    }

    try {
      const ai = new GoogleGenAI({ apiKey });

      const contents = [
        ...(chatRequestDto.history || []).map((item) => ({
          role: item.role,
          parts: [{ text: item.content }],
        })),
        {
          role: 'user',
          parts: [{ text: chatRequestDto.message }],
        },
      ];

      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: PET_CARE_SYSTEM_INSTRUCTION,
        },
      });

      const reply =
        response.text ||
        'Xin lỗi, tôi chưa thể đưa ra câu trả lời vào lúc này. Vui lòng thử lại sau.';

      return {
        reply,
        timestamp: new Date().toISOString(),
        model,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Lỗi khi gọi Google Gemini API: ${error?.message || error}`, error?.stack);

      throw new BadGatewayException(
        'Không thể kết nối đến dịch vụ AI Chatbot lúc này. Vui lòng thử lại sau.',
      );
    }
  }
}
