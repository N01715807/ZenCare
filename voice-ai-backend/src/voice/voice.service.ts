import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SttService } from '../ai/stt/stt.service';
import { ChatService } from '../ai/chat/chat.service';
import { TtsService } from '../ai/tts/tts.service';

@Injectable()
export class VoiceService {
  constructor(
    private readonly sttService: SttService,
    private readonly chatService: ChatService,
    private readonly ttsService: TtsService,
  ) {}

  /**
   * 主流程：音频 -> STT -> Chat -> TTS
   */
  async handleVoiceChat(params: {
    audioBuffer: Buffer;
    voice: string;
    sessionId?: string;
  }): Promise<{
    sessionId: string;
    userText: string;
    replyText: string;
    audioBase64: string;
  }> {
    const { audioBuffer, voice } = params;
    let { sessionId } = params;

    if (!audioBuffer || audioBuffer.length === 0) {
      throw new InternalServerErrorException('音频数据为空');
    }
    if (!voice) {
      throw new InternalServerErrorException('voice 不能为空');
    }

    // 没传 sessionId 就生成一个简单的
    if (!sessionId) {
      sessionId = `sess-${Date.now()}`;
    }

    // STT：语音 -> 用户文字
    const userText = await this.sttService.transcribeAudio(audioBuffer);

    // Chat：用户文字 -> AI 回复文字
    const replyText = await this.chatService.generateReply(userText, sessionId);

    // TTS：AI 回复文字 -> 语音 Buffer
    const ttsBuffer = await this.ttsService.synthesizeSpeech(replyText, voice);

    // 把音频 Buffer 转成 base64，方便前端播放
    const audioBase64 = ttsBuffer.toString('base64');

    return {
      sessionId,
      userText,
      replyText,
      audioBase64,
    };
  }
}
