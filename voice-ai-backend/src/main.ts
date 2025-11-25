import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

async function bootstrap() {
  // 读取 .env
  dotenv.config();
  console.log('API KEY =', process.env.OPENAI_API_KEY);

  // 创建 Nest 应用
  const app = await NestFactory.create(AppModule);

  // 必须：允许前端跨域访问 NestJS
  app.enableCors({
    origin: '*',     // 简单方式：允许所有来源访问（开发阶段 OK）
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // 启动监听
  await app.listen(process.env.PORT ?? 3000);
  console.log(`NestJS running on http://localhost:${process.env.PORT ?? 3000}`);
}
bootstrap();
