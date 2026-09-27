import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import { extname, join, resolve } from 'path';
import { Readable } from 'stream';

export interface LocalImageStreamResult {
  stream: Readable;
  contentType: string;
  contentLength: number;
}

@Injectable()
export class PublicImagesService {
  private readonly logger = new Logger(PublicImagesService.name);
  private readonly baseStorageDir = resolve(process.cwd(), 'files');

  private readonly mimeTypeMap: Record<string, string> = {
    '.jfif': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon',
    '.avif': 'image/avif',
  };

  /**
   * Chuẩn hóa và bảo vệ đường dẫn file tránh lỗi Path Traversal
   */
  public resolveLocalFilePath(rawPath: string): string {
    if (!rawPath) {
      throw new BadRequestException('File path is required');
    }

    let cleanPath = rawPath.trim();

    // Loại bỏ tiền tố /public-images/ nếu có
    cleanPath = cleanPath.replace(/^\/?public-images\/?/i, '');

    // Hỗ trợ decode URI nếu URL bị mã hóa
    try {
      cleanPath = decodeURIComponent(cleanPath);
    } catch {
      // Giữ nguyên cleanPath nếu decode lỗi
    }

    // Loại bỏ dấu / đầu tiên
    cleanPath = cleanPath.replace(/^\/+/, '');

    // Nếu đường dẫn bắt đầu bằng 'files/', bỏ 'files/' để map vào baseStorageDir
    if (cleanPath.toLowerCase().startsWith('files/')) {
      cleanPath = cleanPath.substring(6);
    }

    // Tạo đường dẫn tuyệt đối
    const absolutePath = resolve(this.baseStorageDir, cleanPath);

    // Kiểm tra bảo mật: tuyệt đối không cho phép thoát khỏi thư mục ./files
    if (!absolutePath.startsWith(this.baseStorageDir)) {
      this.logger.warn(`Potential Path Traversal attempt blocked: '${rawPath}'`);
      throw new BadRequestException('Access to the requested path is denied');
    }

    return absolutePath;
  }

  /**
   * Đọc file ảnh từ thư mục lưu trữ cục bộ và trả về Stream dữ liệu
   */
  async getLocalImageStream(rawPath: string): Promise<LocalImageStreamResult> {
    const filePath = this.resolveLocalFilePath(rawPath);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`Image file not found: '${rawPath}'`);
    }

    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      throw new NotFoundException(`Requested path is not a valid file: '${rawPath}'`);
    }

    const ext = extname(filePath).toLowerCase();
    const contentType = this.mimeTypeMap[ext] || 'application/octet-stream';

    const stream = fs.createReadStream(filePath);

    return {
      stream,
      contentType,
      contentLength: stat.size,
    };
  }
}
