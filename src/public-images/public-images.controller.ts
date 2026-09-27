import { Controller, Get, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { PublicImagesService } from './public-images.service';

@ApiTags('Public Images (Local Storage Stream)')
@Controller('public-images')
export class PublicImagesController {
  constructor(private readonly publicImagesService: PublicImagesService) {}

  @Get('*')
  @ApiOperation({
    summary: 'Xem và stream file ảnh từ thư mục lưu trữ trên server',
    description:
      'Nhận đường dẫn ảnh lưu trữ nội bộ (dạng /public-images/files/avatars/...) và stream trực tiếp dữ liệu binary ảnh về trình duyệt.',
  })
  @ApiParam({
    name: 'path',
    description:
      'Đường dẫn file ảnh (Ví dụ: http://localhost:3000/public-images/files/avatars/avatar-1790423610382-949662694.jfif)',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Dữ liệu binary của ảnh (image/jpeg, image/png, image/webp,...)',
  })
  @ApiResponse({
    status: 400,
    description: 'Đường dẫn file không hợp lệ hoặc cố ý tấn công Path Traversal',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy file ảnh trên server',
  })
  async streamLocalImage(@Req() req: Request, @Res() res: Response): Promise<void> {
    // Lấy toàn bộ path sau /public-images/
    const rawPath = req.originalUrl || req.url;

    const result = await this.publicImagesService.getLocalImageStream(rawPath);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Length', result.contentLength);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');

    result.stream.pipe(res);
  }
}
