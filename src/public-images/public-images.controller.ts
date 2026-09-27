import { Controller, Get, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { PublicImagesService } from './public-images.service';

@ApiTags('Public Images (Image Proxy)')
@Controller('public-images')
export class PublicImagesController {
  constructor(private readonly publicImagesService: PublicImagesService) {}

  @Get('*')
  @ApiOperation({
    summary: 'Proxy tải và stream ảnh từ URL bên ngoài',
    description:
      'Nhận URL ảnh từ xa bất kỳ (HTTP/HTTPS), tải về và stream trực tiếp dữ liệu binary ảnh về cho trình duyệt hiển thị.',
  })
  @ApiParam({
    name: 'url',
    description:
      'Đường dẫn URL ảnh từ xa (Ví dụ: http://localhost:3000/public-images/https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500)',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Dữ liệu stream của ảnh (image/jpeg, image/png, image/webp,...)',
  })
  @ApiResponse({
    status: 400,
    description: 'URL không hợp lệ hoặc thiếu tham số',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy ảnh tại máy chủ từ xa',
  })
  @ApiResponse({
    status: 502,
    description: 'Lỗi tải ảnh từ upstream server',
  })
  async proxyImage(@Req() req: Request, @Res() res: Response): Promise<void> {
    // Lấy toàn bộ path sau /public-images/ bao gồm cả query params
    const rawUrl = req.originalUrl || req.url;

    const result = await this.publicImagesService.fetchImageStream(rawUrl);

    res.setHeader('Content-Type', result.contentType);
    if (result.contentLength) {
      res.setHeader('Content-Length', result.contentLength);
    }
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');

    result.stream.pipe(res);
  }
}
