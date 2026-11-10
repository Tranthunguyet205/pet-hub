import { BookingType, ServiceCategory, PaymentStatus } from '@prisma/client';

export interface BookingCostBreakdown {
  serviceAmount: number;
  roomAmount: number;
  stayHours: number;
  totalAmount: number;
}

/**
 * Tính toán chi tiết chi phí cho một đơn booking:
 * - serviceAmount: Tổng giá các dịch vụ trong bookingServices.
 * - roomAmount & stayHours: Tính cho đơn BOARDING có gán phòng lưu trú.
 *   + Check-in: actualStartTime hoặc actualEndTime của CHECK_IN -> expectedCheckInDate -> createdAt.
 *   + Check-out: actualEndTime hoặc actualStartTime của CHECK_OUT -> expectedCheckOutDate -> new Date().
 *   + stayHours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60))).
 * - totalAmount: Nếu đơn đã thanh toán (PAID) và booking.totalAmount > 0 thì ưu tiên booking.totalAmount,
 *   ngược lại = serviceAmount + roomAmount.
 */
export function calculateBookingCost(booking: any): BookingCostBreakdown {
  if (!booking) {
    return {
      serviceAmount: 0,
      roomAmount: 0,
      stayHours: 0,
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
  let stayHours = 0;
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

    const diffMs = Math.max(0, checkOut.getTime() - checkIn.getTime());
    stayHours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
    roomAmount = stayHours * (booking.bookingBoardingRoom.pricePerHour || 0);
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
    stayHours,
    totalAmount,
  };
}

