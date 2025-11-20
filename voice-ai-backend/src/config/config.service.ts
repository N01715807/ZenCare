import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  /**
   * 获取 OpenAI API Key
   */
  getOpenAiKey(): string {
    return process.env.OPENAI_API_KEY || '';
  }

  /**
   * 获取 STT（语音识别）模型名
   */
  getSttModel(): string {
    return process.env.OPENAI_STT_MODEL || 'gpt-4o-mini-tts';
  }

  /**
   * 获取 Chat（对话）模型名
   */
  getChatModel(): string {
    return process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
  }

  /**
   * 获取 TTS（语音合成）模型名
   */
  getTtsModel(): string {
    return process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
  }

  /**
   * 支持的 voice 列表
   */
  getSupportedVoices(): string[] {
    return ['synthex', 'mechaX', 'ioncore']; // 你可以后改
  }
}
