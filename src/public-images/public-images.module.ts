import { Module } from '@nestjs/common';
import { PublicImagesController } from './public-images.controller';
import { PublicImagesService } from './public-images.service';

@Module({
  controllers: [PublicImagesController],
  providers: [PublicImagesService],
  exports: [PublicImagesService],
})
export class PublicImagesModule {}
