/**
 * Tính khoảng thời gian chiếm dụng của một đơn đặt lịch, phục vụ việc chống trùng lịch
 * (PET_HUB_SPEC mục 11 và BR-01).
 *
 * Vấn đề: đơn GROOMING chỉ có `expectedCheckInDate`, không có mốc kết thúc
 * (form đặt lịch của chủ nuôi không hỏi giờ trả với dịch vụ grooming).
 * Không có mốc kết thúc thì không tính được overlap. May là `Service.durationMinutes`
 * đã có sẵn, nên giờ kết thúc = giờ nhận + tổng thời lượng các bước trong đơn.
 */

export interface TimeRange {
  start: Date;
  end: Date;
}

/**
 * Sàn thời lượng của một đơn. Dùng cho trường hợp dữ liệu dịch vụ thiếu
 * `durationMinutes` (= 0), nếu không đơn sẽ có khoảng bằng 0 và không bao giờ bị coi là trùng.
 */
export const MIN_BOOKING_MINUTES = 30;

interface BookingLike {
  expectedCheckInDate: Date | string | null;
  expectedCheckOutDate: Date | string | null;
  bookingServices?: Array<{
    service?: { durationMinutes?: number | null } | null;
  }> | null;
}

/**
 * Trả về khoảng [start, end) mà đơn chiếm dụng, hoặc null nếu đơn chưa có giờ nhận.
 *
 * - BOARDING (có `expectedCheckOutDate`): lấy đúng hai mốc dự kiến.
 * - GROOMING: cộng tổng `durationMinutes` của mọi bước trong đơn (kể cả CHECK_IN/CHECK_OUT,
 *   vì hai bước đó cũng chiếm thời gian của nhân viên).
 *
 * @param extraDurationMinutes thời lượng của dịch vụ sắp được thêm vào đơn
 *   (dùng khi kiểm tra trước lúc gọi POST /booking-services). Chỉ cộng cho đơn
 *   không có mốc trả — đơn lưu trú đã cố định ngày trả nên thêm dịch vụ không dài thêm.
 */
export function getBookingTimeRange(
  booking: BookingLike | null | undefined,
  extraDurationMinutes = 0,
): TimeRange | null {
  if (!booking?.expectedCheckInDate) return null;

  const start = new Date(booking.expectedCheckInDate);
  if (Number.isNaN(start.getTime())) return null;

  if (booking.expectedCheckOutDate) {
    const end = new Date(booking.expectedCheckOutDate);
    if (!Number.isNaN(end.getTime()) && end > start) {
      return { start, end };
    }
  }

  const serviceMinutes = (booking.bookingServices ?? []).reduce(
    (sum, bs) => sum + (bs?.service?.durationMinutes ?? 0),
    0,
  );
  const totalMinutes = Math.max(
    serviceMinutes + extraDurationMinutes,
    MIN_BOOKING_MINUTES,
  );

  return {
    start,
    end: new Date(start.getTime() + totalMinutes * 60 * 1000),
  };
}

/**
 * Hai khoảng thời gian có giao nhau hay không.
 * Công thức theo spec mục 11: `RequestedStart < ExistingEnd AND RequestedEnd > ExistingStart`.
 * Dùng so sánh chặt (`<`, `>`) nên hai ca liền kề (ca này kết thúc đúng lúc ca sau bắt đầu)
 * KHÔNG bị coi là trùng.
 */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && a.end > b.start;
}

/**
 * Giới hạn cửa sổ truy vấn khi đi tìm đơn có khả năng trùng.
 * Một đơn bắt đầu trước thời điểm này quá lâu thì gần như chắc chắn đã kết thúc,
 * nên không cần nạp vào bộ nhớ để so sánh. Đặt rộng tay để đơn lưu trú dài ngày
 * vẫn được xét.
 */
export const CONFLICT_LOOKBACK_DAYS = 60;

export function conflictSearchWindow(range: TimeRange): { gte: Date; lte: Date } {
  return {
    gte: new Date(range.start.getTime() - CONFLICT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000),
    lte: range.end,
  };
}
