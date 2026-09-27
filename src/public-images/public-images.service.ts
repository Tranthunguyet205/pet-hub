import {
  Injectable,
  BadRequestException,
  NotFoundException,
  BadGatewayException,
  Logger,
} from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { Readable } from 'stream';

export interface ImageStreamResult {
  stream: Readable;
  contentType: string;
  contentLength?: string;
}

@Injectable()
export class PublicImagesService {
  private readonly logger = new Logger(PublicImagesService.name);

  /**
   * Trích xuất và chuẩn hóa URL từ xa từ raw path
   */
  public normalizeTargetUrl(rawPath: string): string {
    if (!rawPath) {
      throw new BadRequestException('Image URL is required');
    }

    let targetUrl = rawPath.trim();

    // Bỏ tiền tố /public-images/ nếu có trong rawPath
    targetUrl = targetUrl.replace(/^\/?public-images\/?/i, '');

    // Hỗ trợ decode URI nếu URL bị encode
    try {
      if (targetUrl.includes('%3A') || targetUrl.includes('%2F')) {
        targetUrl = decodeURIComponent(targetUrl);
      }
    } catch {
      // Giữ nguyên targetUrl nếu decodeURIComponent lỗi
    }

    // Khắc phục trường hợp Express collapse double slashes (https:/ -> https://)
    if (/^https?:\/[^/]/i.test(targetUrl)) {
      targetUrl = targetUrl.replace(/^(https?):\/+/i, '$1://');
    }

    // Validate URL hợp lệ
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      throw new BadRequestException(
        `Invalid URL format: '${targetUrl}'. URL must be a valid absolute HTTP or HTTPS URL.`,
      );
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new BadRequestException(
        `Unsupported protocol: '${parsedUrl.protocol}'. Only HTTP and HTTPS are allowed.`,
      );
    }

    return parsedUrl.href;
  }

  /**
   * Tải ảnh từ xa và trả về Stream dữ liệu cùng Content-Type
   */
  async fetchImageStream(rawUrl: string): Promise<ImageStreamResult> {
    const targetUrl = this.normalizeTargetUrl(rawUrl);

    try {
      const response: AxiosResponse<Readable> = await axios.get(targetUrl, {
        responseType: 'stream',
        timeout: 15000,
        maxRedirects: 5,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 PetHub-Proxy/1.0',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
        validateStatus: (status) => status < 400,
      });

      const rawContentType = response.headers['content-type'];
      const contentType = rawContentType
        ? String(rawContentType)
        : 'application/octet-stream';

      const rawContentLength = response.headers['content-length'];
      const contentLength = rawContentLength
        ? String(rawContentLength)
        : undefined;

      return {
        stream: response.data,
        contentType,
        contentLength,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch image from '${targetUrl}': ${error.message}`,
      );

      if (error.response?.status === 404) {
        throw new NotFoundException(`Remote image not found (404) at: ${targetUrl}`);
      }

      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        throw new BadGatewayException(
          `Gateway Timeout: Unable to fetch remote image within 15 seconds from: ${targetUrl}`,
        );
      }

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      throw new BadGatewayException(
        `Failed to proxy remote image from '${targetUrl}': ${error.message}`,
      );
    }
  }
}
