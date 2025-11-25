import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import OpenAI from 'openai';

/**
 * Chat：文字 → 文字
 */
@Injectable()
export class ChatService {
  private readonly client: OpenAI;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.getOpenAiKey();
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY 未配置');
    }

    this.client = new OpenAI({ apiKey });

    console.log('【Chat】使用模型 =', this.config.getChatModel());
  }

  /**
   * 标准聊天入口
   *
   * @param userText  当前用户这句话
   * @param sessionId 会话 ID（可选）
   * @param context   额外上下文（可选）
   */
  async generateReply(
    userText: string,
    sessionId?: string,
    context?: string,
  ): Promise<string> {
    if (!userText || !userText.trim()) {
      throw new InternalServerErrorException('userText 不能为空');
    }

    try {
      const model = this.config.getChatModel();

      const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];

      if (context) {
        messages.push({
          role: 'system',
          content: context,
        });
      }

      messages.push({
        role: 'user',
        content: userText,
      });

      const resp = await this.client.chat.completions.create({
        model,
        messages,
        // 帮你带一下 user 字段，方便以后在 OpenAI 后台按用户区分调用
        ...(sessionId ? { user: sessionId } : {}),
      });

      const replyText = resp.choices[0]?.message?.content || '';

      return replyText;
    } catch (err: any) {
      console.error('【Chat】调用失败原始错误:');
      if (err.error) {
        console.error(JSON.stringify(err.error, null, 2));
      } else if (err.response?.data) {
        console.error(JSON.stringify(err.response.data, null, 2));
      } else {
        console.error(err);
      }
      throw new InternalServerErrorException('聊天生成失败');
    }
  }
}
