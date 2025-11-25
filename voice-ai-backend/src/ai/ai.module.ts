import { Module } from '@nestjs/common';
import { SttService } from './stt/stt.service';
import { ChatService } from './chat/chat.service';
import { TtsService } from './tts/tts.service';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [ConfigModule],            // 给 STT/Chat/TTS 用配置
  providers: [SttService, ChatService, TtsService],
  exports: [SttService, ChatService, TtsService], // ⭐ 必须 export，VoiceModule 才能注入
})
export class AiModule {}

