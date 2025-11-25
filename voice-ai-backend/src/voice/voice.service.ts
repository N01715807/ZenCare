import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SttService } from '../ai/stt/stt.service';
import { ChatService } from '../ai/chat/chat.service';
import { TtsService } from '../ai/tts/tts.service';
import { ConfigService } from '../config/config.service';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    private readonly sttService: SttService,
    private readonly chatService: ChatService,
    private readonly ttsService: TtsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Main pipeline: audio -> STT -> Chat -> TTS
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

    // ---------- basic validation ----------
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new InternalServerErrorException('Audio data is empty.');
    }

    if (!voice) {
      throw new InternalServerErrorException('Voice is required.');
    }

    if (!this.configService.isSupportedVoice(voice)) {
      throw new InternalServerErrorException(
        `Unsupported voice: ${voice}.`,
      );
    }

    if (!sessionId) {
      sessionId = `sess-${Date.now()}`;
    }

    const sttModel = this.configService.getSttModel();
    const chatModel = this.configService.getChatModel();
    const ttsModel = this.configService.getTtsModel();

    const overallStart = Date.now();

    // ---------- STT ----------
    const sttStart = Date.now();
    const userText = await this.sttService.transcribeAudio(audioBuffer);
    const sttCost = Date.now() - sttStart;

    // ---------- Chat ----------
    const chatStart = Date.now();
    const replyText = await this.chatService.generateReply(userText, sessionId);
    const chatCost = Date.now() - chatStart;

    // ---------- TTS ----------
    const ttsStart = Date.now();
    const ttsBuffer = await this.ttsService.synthesizeSpeech(replyText, voice);
    const ttsCost = Date.now() - ttsStart;

    const totalCost = Date.now() - overallStart;
    const audioBase64 = ttsBuffer.toString('base64');

    // ---------- log summary ----------
    this.logger.log(
      `session=${sessionId} voice=${voice} ` +
        `models: STT=${sttModel}, Chat=${chatModel}, TTS=${ttsModel} ` +
        `timing(ms): STT=${sttCost}, Chat=${chatCost}, TTS=${ttsCost}, Total=${totalCost}`,
    );

    return {
      sessionId,
      userText,
      replyText,
      audioBase64,
    };
  }
}
