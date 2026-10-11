import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { BookingServicesService } from './booking-services.service';
import { BookingServicesController } from './booking-services.controller';
import { BookingBoardingRoomsService } from './booking-boarding-rooms.service';
import { BookingBoardingRoomsController } from './booking-boarding-rooms.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { IsOwnerUserConstraint } from '../common/validators/is-owner-user.validator';

@Module({
  imports: [PrismaModule],
  controllers: [
    BookingsController,
    BookingServicesController,
    BookingBoardingRoomsController,
  ],
  providers: [
    BookingsService,
    BookingServicesService,
    BookingBoardingRoomsService,
    IsOwnerUserConstraint,
  ],
  exports: [
    BookingsService,
    BookingServicesService,
    BookingBoardingRoomsService,
  ],
})
export class BookingsModule {}


