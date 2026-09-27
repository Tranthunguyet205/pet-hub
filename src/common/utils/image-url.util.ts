/**
 * Utility chuyển đổi đường dẫn ảnh lưu trữ nội bộ thành Full Backend URL
 * Ví dụ: '/files/avatars/avatar-123.jfif' -> 'http://localhost:3000/public-images/files/avatars/avatar-123.jfif'
 */
export function toPublicImageUrl(
  path: string | null | undefined,
  appUrl?: string,
): string | null {
  if (!path) {
    return null;
  }

  const cleanPath = path.trim();
  if (!cleanPath) {
    return null;
  }

  const baseUrl = (appUrl || process.env.APP_URL || 'http://localhost:3000').replace(
    /\/+$/,
    '',
  );

  // Đã là full HTTP/HTTPS URL
  if (/^https?:\/\//i.test(cleanPath)) {
    // Nếu là URL trỏ tới /files/ của chính hệ thống mà chưa có /public-images/
    if (cleanPath.includes('/files/') && !cleanPath.includes('/public-images/')) {
      return cleanPath.replace(
        /^(https?:\/\/[^/]+)(\/files\/.*)$/i,
        `$1/public-images$2`,
      );
    }
    return cleanPath;
  }

  // Nếu là relative path
  if (cleanPath.startsWith('/public-images/')) {
    return `${baseUrl}${cleanPath}`;
  }

  if (cleanPath.startsWith('public-images/')) {
    return `${baseUrl}/${cleanPath}`;
  }

  const formattedRelativePath = cleanPath.startsWith('/')
    ? cleanPath
    : `/${cleanPath}`;

  return `${baseUrl}/public-images${formattedRelativePath}`;
}
