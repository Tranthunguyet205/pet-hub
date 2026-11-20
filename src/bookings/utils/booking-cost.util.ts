import { BookingType, ServiceCategory, PaymentStatus } from '@prisma/client';
import { businessDateString } from '../../common/utils/business-time.util';

export interface BookingCostBreakdown {
  serviceAmount: number;
  roomAmount: number;
  /** Số ĐÊM lưu trú. Đơn GROOMING luôn là 0. */
  stayNights: number;
  totalAmount: number;
}

/**
 * Đếm số đêm lưu trú theo NGÀY LỊCH (giờ Việt Nam), không theo số giờ.
 *
 * Lý do: khách hiểu "3 ngày 2 đêm" theo ngày lịch. Nếu đếm bằng
 * Math.ceil(số giờ / 24) thì nhận 08:00 ngày 1 — trả 09:00 ngày 3 sẽ ra 3 đêm
 * (49 tiếng), trong khi thực tế chỉ ở 2 đêm.
 *
 * Nhận và trả trong cùng một ngày (gửi theo giờ) vẫn tính 1 đêm — đây là
 * mức tối thiểu, cố ý, vì phòng đã bị chiếm trong ngày đó.
 */
export function countStayNights(checkIn: Date, checkOut: Date): number {
  const inDay = businessDateString(checkIn);
  const outDay = businessDateString(checkOut);
  const diffDays = Math.round(
    (Date.parse(`${outDay}T00:00:00Z`) - Date.parse(`${inDay}T00:00:00Z`)) /
      (24 * 60 * 60 * 1000),
  );
  return Math.max(1, diffDays);
}

/**
 * Tính toán chi tiết chi phí cho một đơn booking:
 * - serviceAmount: Tổng giá các dịch vụ trong bookingServices.
 * - roomAmount & stayNights: Tính cho đơn BOARDING có gán phòng lưu trú.
 *   + Check-in: actualStartTime hoặc actualEndTime của CHECK_IN -> expectedCheckInDate -> createdAt.
 *   + Check-out: actualEndTime hoặc actualStartTime của CHECK_OUT -> expectedCheckOutDate -> new Date().
 *   + stayNights = số đêm theo ngày lịch giờ Việt Nam (xem countStayNights).
 * - totalAmount: Nếu đơn đã thanh toán (PAID) và booking.totalAmount > 0 thì ưu tiên booking.totalAmount,
 *   ngược lại = serviceAmount + roomAmount.
 */
export function calculateBookingCost(booking: any): BookingCostBreakdown {
  if (!booking) {
    return {
      serviceAmount: 0,
      roomAmount: 0,
      stayNights: 0,
      totalAmount: 0,
    };
  }

  // 1. Tính tổng giá các dịch vụ
  const serviceAmount = Array.isArray(booking.bookingServices)
    ? booking.bookingServices.reduce(
        (sum: number, bs: any) => sum + (Number(bs?.price) || 0),
        0,
      )
    : 0;

  // 2. Tính tiền phòng lưu trú nếu là đơn BOARDING
  let stayNights = 0;
  let roomAmount = 0;

  if (
    booking.bookingType === BookingType.BOARDING &&
    booking.bookingBoardingRoom
  ) {
    const bookingServices = Array.isArray(booking.bookingServices)
      ? booking.bookingServices
      : [];

    const checkInBs = bookingServices.find(
      (bs: any) => bs.service?.category === ServiceCategory.CHECK_IN,
    );
    const checkOutBs = bookingServices.find(
      (bs: any) => bs.service?.category === ServiceCategory.CHECK_OUT,
    );

    const checkInRaw =
      checkInBs?.actualStartTime ||
      checkInBs?.actualEndTime ||
      booking.expectedCheckInDate ||
      booking.createdAt;
    const checkIn = checkInRaw ? new Date(checkInRaw) : new Date();

    const checkOutRaw =
      checkOutBs?.actualEndTime ||
      checkOutBs?.actualStartTime ||
      booking.expectedCheckOutDate;
    const checkOut = checkOutRaw ? new Date(checkOutRaw) : new Date();

    stayNights = countStayNights(checkIn, checkOut);
    roomAmount = stayNights * (booking.bookingBoardingRoom.pricePerNight || 0);
  }

  // 3. Tính tổng số tiền (totalAmount)
  let totalAmount: number;
  if (booking.totalAmount > 0 && booking.paymentStatus === PaymentStatus.PAID) {
    totalAmount = booking.totalAmount;
  } else {
    totalAmount = serviceAmount + roomAmount;
  }

  return {
    serviceAmount,
    roomAmount,
    stayNights,
    totalAmount,
  };
}

