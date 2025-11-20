import { Injectable } from '@nestjs/common';
import { SttService } from '../ai/stt/stt.service';
import { ChatService } from '../ai/chat/chat.service';
import { TtsService } from '../ai/tts/tts.service';

@Injectable()
export class VoiceService {
  constructor(
    // 语音转文字（Speech-to-Text）
    private readonly sttService: SttService,
    // 聊天模型（生成 AI 回复）
    private readonly chatService: ChatService,
    // 文字转语音（Text-to-Speech）
    private readonly ttsService: TtsService,
  ) {}

  /**
   * 核心：完整语音对话流程
   *
   * 1. 前端上传一段录音的二进制数据 audioBuffer
   * 2. 我们先把录音转成文本（STT）
   * 3. 再把用户文本丢给 AI 得到回复（Chat）
   * 4. 再把回复转成语音（TTS）
   * 5. 最后返回给前端：sessionId + 文本 + 语音
   *
   * 现在功能都是“假实现”，只是用来确认流程没问题。
   */
  async handleVoiceChat(params: {
    audioBuffer: Buffer; // 用户录音文件（二进制）
    voice: string;       // 用哪种声音来合成语音（男声、女声、AI 声等）
    sessionId?: string;  // 会话 ID，可选
  }): Promise<{
    sessionId: string;   // 会话 ID（用于保持上下文）
    userText: string;    // 用户说的话（STT 识别出来的）
    replyText: string;   // AI 的回复（Chat 模型生成）
    audioBase64: string; // AI 回复的语音（base64 格式）
  }> {
    const { audioBuffer, voice } = params;
    let { sessionId } = params;

    // 如果前端没给 sessionId，我们自己补一个
    // 未来可以用真正的会话 ID（比如 UUID）
    if (!sessionId) {
      sessionId = 'test-session';
    }

    // -----------------------------
    // ① 语音 → 文字：把用户录音转成文本
    // -----------------------------
    // 注意：目前 sttService 里面还没有接 OpenAI，是“假数据”
    const userText = await this.sttService.transcribeAudio(audioBuffer);

    // -----------------------------
    // ② 文字 → 文字：把用户文本给 AI，让它回复
    // -----------------------------
    // 同样 ChatService 现在也是假回复，只是用来跑流程
    const replyText = await this.chatService.generateReply(userText, sessionId);

    // -----------------------------
    // ③ 文字 → 语音：把 AI 的回复变成语音
    // -----------------------------
    // ttsService 现在返回的是随便写的 Buffer.from('fake-audio')
    const audioBufferResult = await this.ttsService.synthesizeSpeech(
      replyText,
      voice,
    );

    // -----------------------------
    // ④ 把语音 Buffer 变成 base64 字符串
    // 前端用更方便，不需要 blob 处理
    // -----------------------------
    const audioBase64 = audioBufferResult.toString('base64');

    // -----------------------------
    // ⑤ 最终统一返回给前端
    // -----------------------------
    return {
      sessionId,  // 确保会话链不断
      userText,    // 用户说的话（文本版）
      replyText,   // AI 回复的文字
      audioBase64, // AI 回复的语音（base64）
    };
  }
}
