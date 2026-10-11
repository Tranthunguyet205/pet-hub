import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PetsModule } from './pets/pets.module';
import { PublicImagesModule } from './public-images/public-images.module';
import { ServicesModule } from './services/services.module';
import { BookingsModule } from './bookings/bookings.module';
import { BoardingRoomsModule } from './boarding-rooms/boarding-rooms.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    PetsModule,
    PublicImagesModule,
    ServicesModule,
    BookingsModule,
    BoardingRoomsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}


