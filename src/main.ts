import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  try {
    console.log('🔧 Initializing NestJS application...');
    const app = await NestFactory.create(AppModule);
    console.log('✅ Application created successfully');

    // Enable CORS for SPA frontend
    app.enableCors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    });

    // Global prefix for all routes
    app.setGlobalPrefix('api');

    // Global pipes for validation
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // Global exception filter
    app.useGlobalFilters(new HttpExceptionFilter());

    // Global response interceptor
    app.useGlobalInterceptors(new TransformInterceptor());

    const port = process.env.PORT ? Number(process.env.PORT) : 3000;
    console.log(`🌐 Starting server on port ${port}...`);
    await app.listen(port);
    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`📚 API available at http://localhost:${port}/api`);
  } catch (error) {
    console.error('❌ Error starting server:');
    console.error(error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    process.exit(1);
  }
}

bootstrap();
