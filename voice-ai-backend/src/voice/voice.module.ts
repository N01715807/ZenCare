import { Module } from '@nestjs/common';
import { VoiceService } from './voice.service';
import { VoiceController } from './voice.controller';
import { AiModule } from '../ai/ai.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [AiModule, ConfigModule],  // ⭐ 这里把 ConfigModule 加进来
  controllers: [VoiceController],
  providers: [VoiceService],
})
export class VoiceModule {}