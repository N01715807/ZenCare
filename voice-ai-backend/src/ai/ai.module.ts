import { Module } from '@nestjs/common';
import { SttService } from './stt/stt.service';
import { ChatService } from './chat/chat.service';
import { TtsService } from './tts/tts.service';

@Module({
  providers: [SttService, ChatService, TtsService]
})
export class AiModule {}
