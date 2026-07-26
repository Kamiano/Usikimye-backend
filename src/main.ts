import 'dotenv/config'; // <-- CRITICAL: This must be the very first line
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable global validation so your CreateIncidentDto rules work
  app.useGlobalPipes(new ValidationPipe());

  // Configure CORS to explicitly allow your live frontend domain
  app.enableCors({
    origin: process.env.FRONTEND_URL || '*', // Allows your hosted Vercel link to connect safely
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // FIXED: Defaults to 5000 locally, but uses the cloud provider's port in production
  const port = process.env.PORT ?? 5000;
  // Bind to 0.0.0.0 to allow cloud network routing
  await app.listen(port, '0.0.0.0');
  console.log(`Usikimye Server successfully initialized on port ${port}`);
}
bootstrap();
