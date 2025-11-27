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

  // 记录哪些 session 已经有过互动（用于区分首句 / 后续）
  private readonly sessionHistory = new Set<string>();

  constructor(
    private readonly sttService: SttService,
    private readonly chatService: ChatService,
    private readonly ttsService: TtsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 进入语音页面自动问好（不需要音频，只用 profile）
   */
  async greetWithProfile(params: {
    voice: string;
    sessionId: string;
    profileText?: string;
  }): Promise<{
    sessionId: string;
    replyText: string;
    audioBase64: string;
  }> {
    const { voice, sessionId, profileText } = params;

    if (!voice) {
      throw new InternalServerErrorException('voice 不能为空');
    }
    if (!this.configService.isSupportedVoice(voice)) {
      throw new InternalServerErrorException(`Unsupported voice: ${voice}.`);
    }
    if (!sessionId) {
      throw new InternalServerErrorException('sessionId 不能为空');
    }

    const ttsModel = this.configService.getTtsModel();
    const chatModel = this.configService.getChatModel();

    const profilePart = profileText
      ? `Here is the user's profile in JSON:\n${profileText}\n`
      : 'User profile is not provided.\n';

    const safetyPart =
      `You are a friendly health check-in companion. ` +
      `You may greet the user, ask about their day, and gently remind them of general healthy habits. ` +
      `You MUST NOT provide medical diagnosis, change medicines, or give specific treatment plans. ` +
      `If the user seems to be in danger or describes very serious symptoms, tell them to contact a doctor or emergency services.\n`;

    const greetingPart =
      `This is the FIRST greeting when the app starts a new voice session. ` +
      `The user has not said anything yet. ` +
      `Use the user's preferredName if present. ` +
      `Give a short, warm greeting (1–2 sentences), briefly mention their health condition in a supportive way, ` +
      `and end with ONE simple question like “How are you feeling today?” or similar. ` +
      `Be concise.`;

    const context = `${safetyPart}\n${profilePart}\n${greetingPart}`;

    // 虚拟一条用户输入，让模型知道是开场白
    const userText = 'The user just opened the app. Please say hi first.';

    const chatStart = Date.now();
    const replyText = await this.chatService.generateReply(
      userText,
      sessionId,
      context, // 这里用上 profile + 规则
    );
    const chatCost = Date.now() - chatStart;

    const ttsStart = Date.now();
    const ttsBuffer = await this.ttsService.synthesizeSpeech(replyText, voice);
    const ttsCost = Date.now() - ttsStart;

    const audioBase64 = ttsBuffer.toString('base64');

    // 标记这个 session 已经有过一次交互
    this.sessionHistory.add(sessionId);

    this.logger.log(
      `session=${sessionId} [GREET] voice=${voice} models: Chat=${chatModel}, TTS=${ttsModel} ` +
        `timing(ms): Chat=${chatCost}, TTS=${ttsCost}`,
    );

    return {
      sessionId,
      replyText,
      audioBase64,
    };
  }

  /**
   * Main pipeline: audio -> STT -> Chat -> TTS
   * （正常语音对话，用户说完话之后）
   */
  async handleVoiceChat(params: {
    audioBuffer: Buffer;
    voice: string;
    sessionId?: string;
    profileText?: string; // 可选：带上 profile，首句增强用
  }): Promise<{
    sessionId: string;
    userText: string;
    replyText: string;
    audioBase64: string;
    shouldNavigate?: boolean;
    targetPage?: string | null;
  }> {
    const { audioBuffer, voice, profileText } = params;
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

    // 判断是不是该 session 的首句
    const isFirstTurn = !this.sessionHistory.has(sessionId);
    if (isFirstTurn) {
      this.sessionHistory.add(sessionId);
    }

    // ---------- STT ----------
    const sttStart = Date.now();
    const userText = await this.sttService.transcribeAudio(audioBuffer);
    const sttCost = Date.now() - sttStart;

    // ---------- 组装 context（带 profile & 首句说明） ----------
    const profilePart = profileText
      ? `Here is the user's profile in JSON:\n${profileText}\n`
      : 'User profile is not provided.\n';

    const safetyPart =
      `You are a friendly health check-in companion. ` +
      `You MUST NOT provide medical diagnosis, change medicines, or give specific treatment plans.\n`;

    const greetingPart = isFirstTurn
      ? `This is the FIRST message of this session (after the greeting). ` +
        `You may still be a bit more welcoming and refer to the user's profile once, ` +
        `but avoid repeating a long introduction. Be brief.`
      : `This is NOT the first message. Continue the conversation naturally and briefly.`;

    const context = `${safetyPart}\n${profilePart}\n${greetingPart}`;

    // ---------- Chat ----------
    const chatStart = Date.now();
    const replyText = await this.chatService.generateReply(
      userText,
      sessionId,
      context, // 带上上下文
    );
    const chatCost = Date.now() - chatStart;

    // ---------- TTS ----------
    const ttsStart = Date.now();
    const ttsBuffer = await this.ttsService.synthesizeSpeech(replyText, voice);
    const ttsCost = Date.now() - ttsStart;

    const totalCost = Date.now() - overallStart;
    const audioBase64 = ttsBuffer.toString('base64');

    // ---------- Navigation intent detection ----------
    let shouldNavigate = false;
    let targetPage: string | null = null;

    const lower = (userText || '').toLowerCase();
    const clean = lower.replace(/[.,!?]/g, ' ');

    // Example: user says "talk with Anna"
    const goCallAnna = clean.includes('anna');
    if (goCallAnna) {
      shouldNavigate = true;
      targetPage = 'call';
    }

    // 你可以继续扩展其他规则，比如：
    // if (lower.includes('add task') || lower.includes('new task')) {
    //   shouldNavigate = true;
    //   targetPage = 'add-task';
    // }

    // ---------- log summary ----------
    this.logger.log(
      `session=${sessionId} voice=${voice} firstTurn=${isFirstTurn} ` +
        `models: STT=${sttModel}, Chat=${chatModel}, TTS=${ttsModel} ` +
        `timing(ms): STT=${sttCost}, Chat=${chatCost}, TTS=${ttsCost}, Total=${totalCost} ` +
        `navigate=${shouldNavigate} target=${targetPage}`,
    );

    return {
      sessionId,
      userText,
      replyText,
      audioBase64,
      shouldNavigate,
      targetPage,
    };
  }
}
