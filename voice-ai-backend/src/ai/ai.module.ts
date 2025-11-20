import { Module } from '@nestjs/common';
import { SttService } from './stt/stt.service';
import { ChatService } from './chat/chat.service';
import { TtsService } from './tts/tts.service';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [ConfigModule],
  providers: [SttService, ChatService, TtsService],
  exports: [SttService, ChatService, TtsService],
})
export class AiModule {}
