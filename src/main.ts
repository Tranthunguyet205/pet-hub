import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { useContainer } from 'class-validator';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      origin: '*',
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    },
  });
  app.setGlobalPrefix('api', {
    exclude: ['public-images/(.*)'],
  });

  // Cho phép class-validator sử dụng NestJS Dependency Injection container
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  // Phục vụ các tệp tĩnh tải lên từ thư mục ./files (truy cập qua http://localhost:3000/files/...)
  app.useStaticAssets(join(process.cwd(), 'files'), {
    prefix: '/files',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger Documentation Configuration
  const swaggerConfig = new DocumentBuilder()
    .setTitle('PetHub - Pet Care Service Management API')
    .setDescription(
      'Hệ thống API quản lý quy trình dịch vụ chăm sóc thú cưng PetHub (Grooming, Boarding, Booking, Care Timeline, Invoices)',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Nhập JWT Access Token vào đây',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3000;

  await app.listen(port, '0.0.0.0');
  console.log(`PetHub API is running on: http://localhost:${port}/api`);
  console.log(`Swagger Documentation is available at: http://localhost:${port}/api/docs`);
}

bootstrap();
