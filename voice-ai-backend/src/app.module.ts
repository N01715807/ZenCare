import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { AiModule } from './ai/ai.module';
import { VoiceModule } from './voice/voice.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [ConfigModule, AiModule, VoiceModule, StorageModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
