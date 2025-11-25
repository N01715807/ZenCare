import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import OpenAI, { toFile } from 'openai';

/**
 * STT：语音转文字
 */
@Injectable()
export class SttService {
  private readonly client: OpenAI;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.getOpenAiKey();
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY 未配置');
    }

    this.client = new OpenAI({ apiKey });

    console.log('【STT】使用模型 =', this.config.getSttModel());
  }

  /**
   * 语音转文字
   *
   * @param audioBuffer 上传的音频 Buffer（webm/mp3/wav 都可以）
   * @returns 识别出的文本
   */
  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new InternalServerErrorException('音频数据为空');
    }

    try {
      // 用官方 SDK 提供的 toFile 把 Buffer 包装成 File 对象
      // 你现在传的是 mp3，就写成 mp3，方便以后排查
      const file = await toFile(audioBuffer, 'input.webm');

      const model = this.config.getSttModel();

      const resp = await this.client.audio.transcriptions.create({
        file,
        model,
        // language: 'zh', // 如果想强制按中文识别，可以打开
      });

      // 返回识别文本
      return resp.text || '';
    } catch (err: any) {
      console.error('【STT】raw error:', err);
      
      const code =
      err?.error?.code ||
      err?.response?.data?.code ||
      err?.code;
      
      if (code === 'insufficient_quota') {
        throw new InternalServerErrorException(
          'STT quota exceeded. Please check your OpenAI billing.',
        );
      }
      
      throw new InternalServerErrorException('Speech-to-text failed.');
    }
  }
}
