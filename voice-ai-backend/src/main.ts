import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

async function bootstrap() {
  
  // Load environment variables from .env file
  dotenv.config(); 
  console.log('API KEY =', process.env.OPENAI_API_KEY); 

  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();