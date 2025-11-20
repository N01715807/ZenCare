import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';

@Injectable()
export class TtsService {
  constructor(private readonly config: ConfigService) {}

  /**
   * 文本转语音（只定义接口，暂不实现）
   *
   * @param text  要读出来的内容
   * @param voice 使用的音色标识（例如：synthex / mechaX / alloy 等）
   * @returns     音频数据（Buffer），例如 mp3
   *
   * 现在只确定入参和出参，后面再接 OpenAI TTS。
   */
  async synthesizeSpeech(text: string, voice: string): Promise<Buffer> {
    // 这里只做接口设计，还没有真正调用 TTS 模型。
    // 后面会在这里用 OpenAI TTS 把 text + voice 生成音频。
    return Buffer.from('fake-audio'); // 占位，避免报错
  }
}