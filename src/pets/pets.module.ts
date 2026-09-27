import { Module } from '@nestjs/common';
import { PetsService } from './pets.service';
import { PetsController } from './pets.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { IsOwnerUserConstraint } from '../common/validators/is-owner-user.validator';

@Module({
  imports: [PrismaModule],
  controllers: [PetsController],
  providers: [PetsService, IsOwnerUserConstraint],
  exports: [PetsService, IsOwnerUserConstraint],
})
export class PetsModule {}
