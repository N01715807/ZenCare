import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';

@Injectable()
export class SttService {
  constructor(private readonly config: ConfigService) {}

  /**
   * 语音转文字（只定义接口，暂不实现）
   *
   * 现在只确定函数长什么样，后面再接 OpenAI。
   * 输入：音频 Buffer
   * 输出：识别出的文字（Promise<string>）
   */
  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    // 这里只做接口设计，还没有真正调用 STT 模型。
    return 'Fake text (not yet integrated with STT)';
  }
}