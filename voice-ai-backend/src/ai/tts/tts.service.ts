import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import OpenAI from 'openai';

@Injectable()
export class TtsService {
  private readonly client: OpenAI;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.getOpenAiKey();
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY 未配置');
    }

    this.client = new OpenAI({ apiKey });

    console.log('【TTS】使用模型 =', this.config.getTtsModel());
  }

  async synthesizeSpeech(text: string, voice: string): Promise<Buffer> {
    if (!text || !text.trim()) {
      throw new InternalServerErrorException('text 不能为空');
    }
    if (!voice || !voice.trim()) {
      throw new InternalServerErrorException('voice 不能为空');
    }

    try {
      const model = this.config.getTtsModel();

      const response = await this.client.audio.speech.create({
        model,
        voice,
        input: text,
      });

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err: any) {
      console.error('【TTS】调用失败原始错误:');
      if (err.error) {
        console.error(JSON.stringify(err.error, null, 2));
      } else if (err.response?.data) {
        console.error(JSON.stringify(err.response.data, null, 2));
      } else {
        console.error(err);
      }

      throw new InternalServerErrorException('语音合成失败');
    }
  }
}
