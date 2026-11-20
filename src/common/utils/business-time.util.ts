/**
 * Tiện ích xử lý thời gian theo múi giờ nghiệp vụ của cửa hàng.
 *
 * Bối cảnh: toàn bộ DateTime được Postgres lưu ở UTC, và process Node (trong Docker)
 * chạy với TZ=UTC. Nhưng giờ làm việc, khung giờ đặt lịch và khái niệm "hôm nay"
 * đều phải tính theo giờ Việt Nam. Vì vậy mọi chỗ cần quy đổi UTC <-> giờ cửa hàng
 * đều phải đi qua file này, KHÔNG dùng getHours()/getDate() trực tiếp
 * (các hàm đó phụ thuộc TZ của máy chạy server).
 */

/** Offset múi giờ nghiệp vụ so với UTC, tính theo phút. Asia/Ho_Chi_Minh = UTC+7. */
export const BUSINESS_UTC_OFFSET_MINUTES = 7 * 60;

/** Dạng chuỗi offset dùng khi ghép ISO string, ví dụ '+07:00'. */
export const BUSINESS_UTC_OFFSET_ISO = (() => {
  const sign = BUSINESS_UTC_OFFSET_MINUTES >= 0 ? '+' : '-';
  const abs = Math.abs(BUSINESS_UTC_OFFSET_MINUTES);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
})();

/**
 * Thời điểm bắt đầu (00:00:00.000) của một ngày theo giờ cửa hàng.
 * @param date Chuỗi 'YYYY-MM-DD'
 */
export function businessDayStart(date: string): Date {
  return new Date(`${date}T00:00:00.000${BUSINESS_UTC_OFFSET_ISO}`);
}

/**
 * Thời điểm kết thúc (23:59:59.999) của một ngày theo giờ cửa hàng.
 * @param date Chuỗi 'YYYY-MM-DD'
 */
export function businessDayEnd(date: string): Date {
  return new Date(`${date}T23:59:59.999${BUSINESS_UTC_OFFSET_ISO}`);
}

/**
 * Đổi một mốc thời gian UTC thành khóa khung giờ 'HH:mm' theo giờ cửa hàng.
 * Ví dụ: 2026-11-20T02:00:00.000Z -> '09:00' (giờ VN).
 */
export function businessTimeKey(value: Date): string {
  const shifted = new Date(
    value.getTime() + BUSINESS_UTC_OFFSET_MINUTES * 60 * 1000,
  );
  const hh = String(shifted.getUTCHours()).padStart(2, '0');
  const mm = String(shifted.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Đổi một mốc thời gian UTC thành chuỗi ngày 'YYYY-MM-DD' theo giờ cửa hàng.
 * Ví dụ: 2026-11-20T17:30:00.000Z -> '2026-11-21' (vì đã sang ngày hôm sau ở VN).
 */
export function businessDateString(value: Date): string {
  const shifted = new Date(
    value.getTime() + BUSINESS_UTC_OFFSET_MINUTES * 60 * 1000,
  );
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Chuẩn hóa tham số lọc theo khoảng thời gian.
 * - 'YYYY-MM-DD'      -> đầu/cuối ngày theo GIỜ CỬA HÀNG (không phải UTC).
 * - Chuỗi ISO đầy đủ  -> giữ nguyên thời điểm client gửi lên.
 *
 * Trả về undefined nếu không có giá trị hoặc giá trị không parse được.
 */
export function parseBusinessRangeBoundary(
  value: string | undefined,
  edge: 'start' | 'end',
): Date | undefined {
  if (!value) return undefined;

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const parsed = isDateOnly
    ? edge === 'start'
      ? businessDayStart(value)
      : businessDayEnd(value)
    : new Date(value);

  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
