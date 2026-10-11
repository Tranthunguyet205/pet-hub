import { Module } from '@nestjs/common';
import { BoardingRoomsService } from './boarding-rooms.service';
import { BoardingRoomsController } from './boarding-rooms.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BoardingRoomsController],
  providers: [BoardingRoomsService],
  exports: [BoardingRoomsService],
})
export class BoardingRoomsModule {}
